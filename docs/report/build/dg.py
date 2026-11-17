"""
Mini diagram engine for the Chapter 3 report.

One geometry model -> two outputs:
  * .drawio  (mxGraph XML, editable in draw.io / diagrams.net)
  * .png     (rendered with Pillow, same layout, inserted in the Word report)

Supported notations: BPMN 2.0 (pool/lane, task, events, gateways, sequence/message flow),
UML use case (actor, use case, system boundary, include/extend/generalization),
UML class (class box, association/composition/aggregation/generalization, multiplicity),
UML state machine, ER (Crow's foot).
"""
from __future__ import annotations

import html
import math
import os
from dataclasses import dataclass, field
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = "C:/Windows/Fonts"
SCALE = 2  # PNG pixels per diagram unit


def _font(size: float, bold=False, italic=False):
    name = "arialbd.ttf" if bold and not italic else "arialbi.ttf" if bold and italic else "ariali.ttf" if italic else "arial.ttf"
    return ImageFont.truetype(os.path.join(FONT_DIR, name), int(size * SCALE))


# ---------------------------------------------------------------- model
@dataclass
class Node:
    id: str
    kind: str
    x: float
    y: float
    w: float
    h: float
    text: str = ""
    fill: str = "#FFFFFF"
    stroke: str = "#333333"
    font: float = 11
    bold: bool = False
    # class / entity
    header: str = ""
    attrs: list = field(default_factory=list)
    ops: list = field(default_factory=list)
    stereotype: str = ""

    @property
    def cx(self):
        return self.x + self.w / 2

    @property
    def cy(self):
        return self.y + self.h / 2

    def side(self, s: str, t: float = 0.5):
        if s == "r":
            return (self.x + self.w, self.y + self.h * t)
        if s == "l":
            return (self.x, self.y + self.h * t)
        if s == "t":
            return (self.x + self.w * t, self.y)
        if s == "b":
            return (self.x + self.w * t, self.y + self.h)
        raise ValueError(s)


@dataclass
class Edge:
    a: str
    b: str
    text: str = ""
    kind: str = "seq"
    pts: list | None = None  # interior waypoints
    sa: str | None = None
    ta: str | None = None
    st: float = 0.5  # position along the source side
    tt: float = 0.5
    card_a: str = ""  # multiplicity / ER end at source
    card_b: str = ""
    label_at: float = 0.5  # 0..1 along the polyline
    label_dx: float = 0
    label_dy: float = 0


class Diagram:
    def __init__(self, name: str, w: float, h: float, title: str = ""):
        self.name, self.w, self.h, self.title = name, w, h, title
        self.nodes: dict[str, Node] = {}
        self.order: list[str] = []
        self.edges: list[Edge] = []

    # -------------------------------------------------------- builders
    def add(self, id, kind, x, y, w, h, text="", **kw) -> Node:
        n = Node(id, kind, x, y, w, h, text, **kw)
        self.nodes[id] = n
        self.order.append(id)
        return n

    def edge(self, a, b, text="", kind="seq", **kw) -> Edge:
        e = Edge(a, b, text, kind, **kw)
        self.edges.append(e)
        return e

    # -------------------------------------------------------- routing
    def _auto_sides(self, a: Node, b: Node):
        if a.kind in ("actor",) or b.kind in ("actor",):
            return ("r" if b.cx > a.cx else "l", "l" if b.cx > a.cx else "r")
        dx, dy = b.cx - a.cx, b.cy - a.cy
        if b.x >= a.x + a.w - 1:
            return "r", "l"
        if b.x + b.w <= a.x + 1:
            return "l", "r"
        return ("b", "t") if dy > 0 else ("t", "b")

    def route(self, e: Edge):
        a, b = self.nodes[e.a], self.nodes[e.b]
        if e.kind in ("assoc_uc", "include", "extend", "gen_uc"):
            return self._route_straight(a, b, e)
        sa, ta = e.sa, e.ta
        if not sa or not ta:
            s2, t2 = self._auto_sides(a, b)
            sa, ta = sa or s2, ta or t2
        p0, p1 = a.side(sa, e.st), b.side(ta, e.tt)
        if e.pts is not None:
            return [p0, *e.pts, p1], sa, ta
        hs, ht = sa in "lr", ta in "lr"
        if hs and ht:
            if abs(p0[1] - p1[1]) < 0.5:
                pts = []
            else:
                mx = (p0[0] + p1[0]) / 2
                pts = [(mx, p0[1]), (mx, p1[1])]
        elif not hs and not ht:
            if abs(p0[0] - p1[0]) < 0.5:
                pts = []
            else:
                # bend just before the target so the horizontal run never lies on a lane border
                my = p1[1] - 16 if p1[1] > p0[1] else p1[1] + 16
                pts = [(p0[0], my), (p1[0], my)]
        elif not hs and ht:
            pts = [(p0[0], p1[1])]
        else:
            pts = [(p1[0], p0[1])]
        return [p0, *pts, p1], sa, ta

    @staticmethod
    def _clip(n: Node, toward):
        """Point on the border of n on the line from its centre toward `toward`."""
        cx, cy = n.cx, (n.y + 38 if n.kind == "actor" else n.cy)
        dx, dy = toward[0] - cx, toward[1] - cy
        if dx == 0 and dy == 0:
            return cx, cy
        if n.kind in ("usecase", "event_start", "event_end", "event_timer", "event_msg", "state_start", "state_end"):
            rx, ry = n.w / 2, n.h / 2
            t = 1 / math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
            return cx + dx * t, cy + dy * t
        if n.kind == "actor":  # figure + label below it
            rx, ry = n.w / 2 + 6, 40
        else:
            rx, ry = n.w / 2, n.h / 2
        t = min(rx / abs(dx) if dx else 1e9, ry / abs(dy) if dy else 1e9)
        return cx + dx * t, cy + dy * t

    def _route_straight(self, a, b, e):
        ca = (a.cx, a.y + 38) if a.kind == "actor" else (a.cx, a.cy)
        cb = (b.cx, b.y + 38) if b.kind == "actor" else (b.cx, b.cy)
        if e.pts:
            return [self._clip(a, e.pts[0]), *e.pts, self._clip(b, e.pts[-1])], None, None
        return [self._clip(a, cb), self._clip(b, ca)], None, None

    # -------------------------------------------------------- drawio export
    STYLE = {
        "task": "rounded=1;whiteSpace=wrap;html=1;arcSize=12;",
        "rect": "rounded=0;whiteSpace=wrap;html=1;",
        "data": "shape=note;whiteSpace=wrap;html=1;size=10;",
        "event_start": "shape=mxgraph.bpmn.event;outline=standard;symbol=general;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;perimeter=ellipsePerimeter;",
        "event_end": "shape=mxgraph.bpmn.event;outline=end;symbol=terminate2;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;perimeter=ellipsePerimeter;",
        "event_timer": "shape=mxgraph.bpmn.event;outline=catching;symbol=timer;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;perimeter=ellipsePerimeter;",
        "event_msg": "shape=mxgraph.bpmn.event;outline=catching;symbol=message;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;perimeter=ellipsePerimeter;",
        "gw_x": "shape=mxgraph.bpmn.gateway2;gwType=exclusive;html=1;verticalLabelPosition=top;verticalAlign=bottom;align=center;perimeter=rhombusPerimeter;",
        "gw_p": "shape=mxgraph.bpmn.gateway2;gwType=parallel;html=1;verticalLabelPosition=top;verticalAlign=bottom;align=center;perimeter=rhombusPerimeter;",
        "pool": "swimlane;horizontal=0;startSize=28;html=1;whiteSpace=wrap;fillColor=none;",
        "lane": "swimlane;horizontal=0;startSize=28;html=1;whiteSpace=wrap;fillColor=none;swimlaneLine=1;",
        "actor": "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;whiteSpace=wrap;",
        "usecase": "ellipse;whiteSpace=wrap;html=1;",
        "boundary": "rounded=0;whiteSpace=wrap;html=1;fillColor=none;verticalAlign=top;fontStyle=1;align=center;",
        "package": "shape=folder;tabWidth=110;tabHeight=18;tabPosition=left;whiteSpace=wrap;html=1;verticalAlign=top;fontStyle=1;fillColor=none;spacingTop=18;",
        "class": "html=1;whiteSpace=wrap;verticalAlign=top;align=left;spacingLeft=4;spacingRight=4;overflow=fill;",
        "entity": "html=1;whiteSpace=wrap;verticalAlign=top;align=left;spacingLeft=4;spacingRight=4;overflow=fill;",
        "cdm": "rounded=1;whiteSpace=wrap;html=1;arcSize=8;fontStyle=1;",
        "state": "rounded=1;whiteSpace=wrap;html=1;arcSize=35;",
        "state_start": "ellipse;html=1;fillColor=#000000;strokeColor=#000000;",
        "state_end": "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;",
        "note": "shape=note;whiteSpace=wrap;html=1;size=12;align=left;spacingLeft=6;fillColor=#FFF8DC;",
        "text": "text;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;strokeColor=none;fillColor=none;",
    }

    EDGE_STYLE = {
        "seq": "endArrow=block;endFill=1;html=1;rounded=0;",
        "msg": "dashed=1;endArrow=open;endFill=0;startArrow=oval;startFill=0;html=1;rounded=0;",
        "assoc_uc": "endArrow=none;html=1;",
        "include": "dashed=1;endArrow=open;endFill=0;html=1;",
        "extend": "dashed=1;endArrow=open;endFill=0;html=1;",
        "gen_uc": "endArrow=block;endFill=0;endSize=12;html=1;",
        "assoc": "endArrow=none;html=1;rounded=0;",
        "nav": "endArrow=open;endFill=0;html=1;rounded=0;",
        "comp": "startArrow=diamondThin;startFill=1;startSize=14;endArrow=none;html=1;rounded=0;",
        "aggr": "startArrow=diamondThin;startFill=0;startSize=14;endArrow=none;html=1;rounded=0;",
        "gen": "endArrow=block;endFill=0;endSize=12;html=1;rounded=0;",
        "dep": "dashed=1;endArrow=open;endFill=0;html=1;rounded=0;",
        "real": "dashed=1;endArrow=block;endFill=0;endSize=12;html=1;rounded=0;",
        "trans": "endArrow=open;endFill=0;html=1;rounded=0;",
        "er": "html=1;rounded=0;",
        "line": "endArrow=none;html=1;rounded=0;dashed=1;",
    }
    ER_DRAWIO = {"one": "ERmandOne", "zero_one": "ERzeroToOne", "many": "ERmany", "one_many": "ERoneToMany", "zero_many": "ERzeroToMany"}

    def _label_html(self, n: Node) -> str:
        if n.kind in ("class", "entity"):
            parts = []
            if n.stereotype:
                parts.append(f'<div style="text-align:center"><i>«{escape(n.stereotype)}»</i></div>')
            parts.append(f'<div style="text-align:center"><b>{escape(n.header or n.text)}</b></div>')
            parts.append("<hr size=\"1\">")
            parts.append("<br>".join(escape(a) for a in n.attrs) or "&nbsp;")
            if n.kind == "class" and n.ops:
                parts.append("<hr size=\"1\">")
                parts.append("<br>".join(escape(o) for o in n.ops))
            return "".join(parts)
        return escape(n.text).replace("\n", "<br>")

    def to_drawio(self) -> str:
        cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
        for nid in self.order:
            n = self.nodes[nid]
            st = self.STYLE[n.kind]
            st += f"fillColor={n.fill};" if n.kind not in ("pool", "lane", "boundary", "package", "state_start", "state_end", "text", "note") else ""
            if n.kind not in ("state_start", "state_end", "text"):
                st += f"strokeColor={n.stroke};"
            st += f"fontSize={n.font};fontFamily=Arial;"
            if n.kind in ("gw_x", "gw_p") and n.stereotype == "below":
                st = st.replace("verticalLabelPosition=top;verticalAlign=bottom;", "verticalLabelPosition=bottom;verticalAlign=top;")
            if n.bold and n.kind not in ("boundary", "package"):
                st += "fontStyle=1;"
            val = html.escape(self._label_html(n), quote=True)
            cells.append(
                f'<mxCell id="{nid}" value="{val}" style="{st}" vertex="1" parent="1">'
                f'<mxGeometry x="{n.x:.0f}" y="{n.y:.0f}" width="{n.w:.0f}" height="{n.h:.0f}" as="geometry"/></mxCell>'
            )
        for i, e in enumerate(self.edges):
            pts, sa, ta = self.route(e)
            st = self.EDGE_STYLE[e.kind]
            if e.kind == "er":
                st += f"startArrow={self.ER_DRAWIO[e.card_a]};endArrow={self.ER_DRAWIO[e.card_b]};startFill=0;endFill=0;"
            if e.kind not in ("assoc_uc", "include", "extend", "gen_uc"):
                st += "edgeStyle=orthogonalEdgeStyle;" if len(pts) > 2 else ""
                a, b = self.nodes[e.a], self.nodes[e.b]
                ex, ey = (pts[0][0] - a.x) / a.w, (pts[0][1] - a.y) / a.h
                nx, ny = (pts[-1][0] - b.x) / b.w, (pts[-1][1] - b.y) / b.h
                st += f"exitX={ex:.3f};exitY={ey:.3f};exitDx=0;exitDy=0;entryX={nx:.3f};entryY={ny:.3f};entryDx=0;entryDy=0;"
            st += "fontSize=10;fontFamily=Arial;labelBackgroundColor=#FFFFFF;"
            label = e.text
            if e.kind == "include":
                label = "«include»"
            elif e.kind == "extend":
                label = "«extend»" + (f"\n{e.text}" if e.text else "")
            val = html.escape(escape(label).replace("\n", "<br>"), quote=True)
            way = "".join(f'<mxPoint x="{x:.0f}" y="{y:.0f}"/>' for x, y in pts[1:-1])
            geo = f'<mxGeometry relative="1" as="geometry">' + (f'<Array as="points">{way}</Array>' if way else "") + "</mxGeometry>"
            cells.append(f'<mxCell id="e{i}" value="{val}" style="{st}" edge="1" parent="1" source="{e.a}" target="{e.b}">{geo}</mxCell>')
            # multiplicities as separate edge labels
            for j, (txt, pos) in enumerate(((e.card_a, -0.85), (e.card_b, 0.85))):
                if txt and e.kind != "er":
                    cells.append(
                        f'<mxCell id="e{i}m{j}" value="{html.escape(txt)}" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontSize=10;" vertex="1" connectable="0" parent="e{i}">'
                        f'<mxGeometry x="{pos}" y="-10" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>'
                    )
        body = "".join(cells)
        return (
            f'<mxfile host="CasEYE report generator"><diagram id="{self.name}" name="{escape(self.title or self.name)}">'
            f'<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{int(self.w)}" pageHeight="{int(self.h)}" math="0" shadow="0">'
            f"<root>{body}</root></mxGraphModel></diagram></mxfile>"
        )

    # -------------------------------------------------------- PNG render
    def _S(self, v):
        return v * SCALE

    def _wrap(self, draw, text, font, maxw):
        lines = []
        for para in text.split("\n"):
            words = para.split(" ")
            cur = ""
            for w in words:
                t = (cur + " " + w).strip()
                if draw.textlength(t, font=font) <= maxw or not cur:
                    cur = t
                else:
                    lines.append(cur)
                    cur = w
            lines.append(cur)
        return lines

    def _text_box(self, draw, text, x, y, w, h, size=11, bold=False, italic=False, align="center", valign="middle", fill="#111111"):
        if not text:
            return
        font = _font(size, bold, italic)
        lines = self._wrap(draw, text, font, self._S(w) - 8)
        lh = font.size * 1.18
        total = lh * len(lines)
        X, Y, W, H = map(self._S, (x, y, w, h))
        ty = Y + (H - total) / 2 if valign == "middle" else Y + 4 if valign == "top" else Y + H - total - 4
        for ln in lines:
            tw = draw.textlength(ln, font=font)
            tx = X + (W - tw) / 2 if align == "center" else X + 6
            draw.text((tx, ty), ln, font=font, fill=fill)
            ty += lh

    def _arrow(self, draw, p_from, p_to, kind="filled", size=9, color="#333333"):
        (x0, y0), (x1, y1) = p_from, p_to
        ang = math.atan2(y1 - y0, x1 - x0)
        s = self._S(size)
        X1, Y1 = self._S(x1), self._S(y1)
        left = (X1 - s * math.cos(ang - 0.42), Y1 - s * math.sin(ang - 0.42))
        right = (X1 - s * math.cos(ang + 0.42), Y1 - s * math.sin(ang + 0.42))
        if kind == "filled":
            draw.polygon([(X1, Y1), left, right], fill=color)
        elif kind == "hollow":
            s2 = self._S(size + 4)
            left = (X1 - s2 * math.cos(ang - 0.5), Y1 - s2 * math.sin(ang - 0.5))
            right = (X1 - s2 * math.cos(ang + 0.5), Y1 - s2 * math.sin(ang + 0.5))
            draw.polygon([(X1, Y1), left, right], fill="#FFFFFF", outline=color)
            draw.line([left, right, (X1, Y1), left], fill=color, width=SCALE)
        elif kind == "open":
            draw.line([left, (X1, Y1), right], fill=color, width=SCALE * 1)

    def _diamond_end(self, draw, p_at, p_next, filled, color="#333333"):
        (x0, y0), (x1, y1) = p_at, p_next
        ang = math.atan2(y1 - y0, x1 - x0)
        L, Wd = self._S(16), self._S(6)
        X0, Y0 = self._S(x0), self._S(y0)
        tip2 = (X0 + L * math.cos(ang), Y0 + L * math.sin(ang))
        mid = (X0 + L / 2 * math.cos(ang), Y0 + L / 2 * math.sin(ang))
        side1 = (mid[0] + Wd * math.cos(ang + math.pi / 2), mid[1] + Wd * math.sin(ang + math.pi / 2))
        side2 = (mid[0] - Wd * math.cos(ang + math.pi / 2), mid[1] - Wd * math.sin(ang + math.pi / 2))
        draw.polygon([(X0, Y0), side1, tip2, side2], fill=color if filled else "#FFFFFF", outline=color)

    def _er_end(self, draw, p_at, p_next, card, color="#333333"):
        """Crow's foot symbol drawn at p_at (on the entity border) toward p_next."""
        (x0, y0), (x1, y1) = p_at, p_next
        ang = math.atan2(y1 - y0, x1 - x0)
        ux, uy = math.cos(ang), math.sin(ang)
        px, py = -uy, ux
        X0, Y0 = self._S(x0), self._S(y0)
        w = SCALE
        def P(d, o=0):
            return (X0 + self._S(d) * ux + self._S(o) * px, Y0 + self._S(d) * uy + self._S(o) * py)
        many = card in ("many", "one_many", "zero_many")
        if many:
            draw.line([P(0, -7), P(11)], fill=color, width=w)
            draw.line([P(0, 7), P(11)], fill=color, width=w)
            draw.line([P(0), P(11)], fill=color, width=w)
        if card in ("one", "one_many"):
            d = 14 if many else 6
            draw.line([P(d, -6), P(d, 6)], fill=color, width=w)
            if card == "one":
                draw.line([P(d + 5, -6), P(d + 5, 6)], fill=color, width=w)
        if card in ("zero_one", "zero_many"):
            d = 18 if many else 12
            r = self._S(4)
            c = P(d)
            draw.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill="#FFFFFF", outline=color, width=w)
            if card == "zero_one":
                draw.line([P(5, -6), P(5, 6)], fill=color, width=w)

    def _dashed(self, draw, pts, color="#333333", dash=6, gap=4):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            L = math.hypot(x1 - x0, y1 - y0)
            if L == 0:
                continue
            ux, uy = (x1 - x0) / L, (y1 - y0) / L
            t = 0
            while t < L:
                t2 = min(t + dash, L)
                draw.line([(self._S(x0 + ux * t), self._S(y0 + uy * t)), (self._S(x0 + ux * t2), self._S(y0 + uy * t2))], fill=color, width=SCALE)
                t = t2 + gap

    def to_png(self, path):
        img = Image.new("RGB", (int(self._S(self.w)), int(self._S(self.h))), "#FFFFFF")
        d = ImageDraw.Draw(img)
        S = self._S
        # containers first
        for nid in self.order:
            n = self.nodes[nid]
            X, Y, W, H = S(n.x), S(n.y), S(n.w), S(n.h)
            if n.kind in ("pool", "lane"):
                d.rectangle([X, Y, X + W, Y + H], outline=n.stroke, width=SCALE)
                d.line([X + S(28), Y, X + S(28), Y + H], fill=n.stroke, width=SCALE)
                # vertical label
                f = _font(n.font, bold=n.kind == "pool")
                lines = self._wrap(d, n.text, f, H - S(12))
                lh = int(f.size * 1.2)
                tw = max(d.textlength(t, font=f) for t in lines)
                tmp = Image.new("RGBA", (int(tw) + 10, lh * len(lines) + 4), (255, 255, 255, 0))
                td = ImageDraw.Draw(tmp)
                for k, t in enumerate(lines):
                    td.text(((tw - td.textlength(t, font=f)) / 2 + 5, k * lh), t, font=f, fill="#111111")
                tmp = tmp.rotate(90, expand=True)
                img.paste(tmp, (int(X + S(14) - tmp.width / 2), int(Y + H / 2 - tmp.height / 2)), tmp)
            elif n.kind == "boundary":
                d.rectangle([X, Y, X + W, Y + H], outline=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x, n.y + 2, n.w, 18, size=n.font, bold=True)
            elif n.kind == "package":
                d.rectangle([X, Y, X + S(110), Y + S(18)], outline=n.stroke, width=SCALE, fill="#FFFFFF")
                d.rectangle([X, Y + S(18), X + W, Y + H], outline=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x, n.y, 110, 18, size=n.font - 1, bold=True)
        # edges
        for e in self.edges:
            pts, sa, ta = self.route(e)
            col = "#333333"
            dashed = e.kind in ("msg", "include", "extend", "dep", "line", "real")
            if dashed:
                self._dashed(d, pts, col)
            else:
                d.line([(S(x), S(y)) for x, y in pts], fill=col, width=SCALE, joint="curve")
            last, prev = pts[-1], pts[-2]
            if e.kind == "seq":
                self._arrow(d, prev, last, "filled")
            elif e.kind in ("msg", "include", "extend", "dep", "trans", "nav"):
                self._arrow(d, prev, last, "open")
                if e.kind == "msg":
                    r = S(3.5)
                    d.ellipse([S(pts[0][0]) - r, S(pts[0][1]) - r, S(pts[0][0]) + r, S(pts[0][1]) + r], fill="#FFFFFF", outline=col, width=SCALE)
            elif e.kind in ("gen", "gen_uc", "real"):
                self._arrow(d, prev, last, "hollow", size=10)
            elif e.kind in ("comp", "aggr"):
                self._diamond_end(d, pts[0], pts[1], e.kind == "comp")
            elif e.kind == "er":
                self._er_end(d, pts[0], pts[1], e.card_a)
                self._er_end(d, pts[-1], pts[-2], e.card_b)
            # label
            label = e.text
            if e.kind == "include":
                label = "«include»"
            elif e.kind == "extend":
                label = "«extend»" + (f"\n{e.text}" if e.text else "")
            if label:
                lx, ly = self._along(pts, e.label_at)
                lx += e.label_dx
                ly += e.label_dy
                f = _font(9.5)
                lines = label.split("\n")
                wmax = max(d.textlength(t, font=f) for t in lines) / SCALE + 6
                hh = len(lines) * 12 + 2
                d.rectangle([S(lx - wmax / 2), S(ly - hh / 2), S(lx + wmax / 2), S(ly + hh / 2)], fill="#FFFFFF")
                for k, t in enumerate(lines):
                    tw = d.textlength(t, font=f)
                    d.text((S(lx) - tw / 2, S(ly - hh / 2 + 1 + k * 12)), t, font=f, fill="#222222")
            for txt, end, nxt in ((e.card_a, pts[0], pts[1]), (e.card_b, pts[-1], pts[-2])):
                if txt and e.kind != "er":
                    ang = math.atan2(nxt[1] - end[1], nxt[0] - end[0])
                    bx = end[0] + 14 * math.cos(ang) - 9 * math.sin(ang)
                    by = end[1] + 14 * math.sin(ang) + 9 * math.cos(ang)
                    f = _font(9.5)
                    tw = d.textlength(txt, font=f)
                    d.text((S(bx) - tw / 2, S(by) - f.size / 2), txt, font=f, fill="#222222")
        # shapes
        for nid in self.order:
            n = self.nodes[nid]
            X, Y, W, H = S(n.x), S(n.y), S(n.w), S(n.h)
            k = n.kind
            if k in ("task", "cdm", "state"):
                rad = S(8) if k != "state" else S(min(n.h / 2.5, 16))
                d.rounded_rectangle([X, Y, X + W, Y + H], radius=rad, fill=n.fill, outline=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x, n.y, n.w, n.h, n.font, n.bold or k == "cdm")
            elif k == "rect":
                d.rectangle([X, Y, X + W, Y + H], fill=n.fill, outline=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x, n.y, n.w, n.h, n.font, n.bold)
            elif k == "data":
                fold = S(10)
                d.polygon([(X, Y), (X + W - fold, Y), (X + W, Y + fold), (X + W, Y + H), (X, Y + H)], fill=n.fill, outline=n.stroke)
                d.line([(X + W - fold, Y), (X + W - fold, Y + fold), (X + W, Y + fold)], fill=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x, n.y, n.w, n.h, n.font - 1)
            elif k == "note":
                fold = S(12)
                d.polygon([(X, Y), (X + W - fold, Y), (X + W, Y + fold), (X + W, Y + H), (X, Y + H)], fill="#FFF8DC", outline=n.stroke)
                self._text_box(d, n.text, n.x, n.y, n.w, n.h, n.font, align="left")
            elif k.startswith("event"):
                width = SCALE * (4 if k == "event_end" else 1)
                d.ellipse([X, Y, X + W, Y + H], fill="#FFFFFF", outline=n.stroke, width=width)
                if k in ("event_timer", "event_msg"):
                    g = S(3)
                    d.ellipse([X + g, Y + g, X + W - g, Y + H - g], outline=n.stroke, width=SCALE)
                if k == "event_end":
                    g = S(9)
                    d.ellipse([X + g, Y + g, X + W - g, Y + H - g], fill=n.stroke)
                if k == "event_timer":
                    cx, cy, r = X + W / 2, Y + H / 2, W / 2 - S(7)
                    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=n.stroke, width=SCALE)
                    d.line([(cx, cy), (cx, cy - r * 0.75)], fill=n.stroke, width=SCALE)
                    d.line([(cx, cy), (cx + r * 0.55, cy)], fill=n.stroke, width=SCALE)
                if k == "event_msg":
                    m = S(9)
                    d.rectangle([X + m, Y + m + S(2), X + W - m, Y + H - m - S(2)], outline=n.stroke, width=SCALE)
                    d.line([(X + m, Y + m + S(2)), (X + W / 2, Y + H / 2), (X + W - m, Y + m + S(2))], fill=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x - 40, n.y + n.h + 1, n.w + 80, 28, n.font - 1, valign="top")
            elif k in ("gw_x", "gw_p"):
                d.polygon([(X + W / 2, Y), (X + W, Y + H / 2), (X + W / 2, Y + H), (X, Y + H / 2)], fill="#FFFFFF", outline=n.stroke)
                d.line([(X + W / 2, Y), (X + W, Y + H / 2), (X + W / 2, Y + H), (X, Y + H / 2), (X + W / 2, Y)], fill=n.stroke, width=SCALE)
                m = W * 0.3
                if k == "gw_x":
                    d.line([(X + m, Y + m), (X + W - m, Y + H - m)], fill=n.stroke, width=SCALE * 3)
                    d.line([(X + W - m, Y + m), (X + m, Y + H - m)], fill=n.stroke, width=SCALE * 3)
                else:
                    d.line([(X + W / 2, Y + m * 0.8), (X + W / 2, Y + H - m * 0.8)], fill=n.stroke, width=SCALE * 3)
                    d.line([(X + m * 0.8, Y + H / 2), (X + W - m * 0.8, Y + H / 2)], fill=n.stroke, width=SCALE * 3)
                if n.stereotype == "below":
                    self._text_box(d, n.text, n.x - 45, n.y + n.h + 1, n.w + 90, 28, n.font - 1, valign="top")
                else:
                    self._text_box(d, n.text, n.x - 45, n.y - 29, n.w + 90, 28, n.font - 1, valign="bottom")
            elif k == "actor":
                cx = X + W / 2
                r = S(7)
                top = Y
                d.ellipse([cx - r, top, cx + r, top + 2 * r], outline=n.stroke, width=SCALE)
                d.line([(cx, top + 2 * r), (cx, top + S(30))], fill=n.stroke, width=SCALE)
                d.line([(cx - S(11), top + S(20)), (cx + S(11), top + S(20))], fill=n.stroke, width=SCALE)
                d.line([(cx, top + S(30)), (cx - S(9), top + S(44))], fill=n.stroke, width=SCALE)
                d.line([(cx, top + S(30)), (cx + S(9), top + S(44))], fill=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x - 30, n.y + 46, n.w + 60, 30, n.font, n.bold, valign="top")
            elif k == "usecase":
                d.ellipse([X, Y, X + W, Y + H], fill=n.fill, outline=n.stroke, width=SCALE)
                self._text_box(d, n.text, n.x + 8, n.y, n.w - 16, n.h, n.font)
            elif k in ("class", "entity"):
                d.rectangle([X, Y, X + W, Y + H], fill=n.fill, outline=n.stroke, width=SCALE)
                yy = n.y + 3
                if n.stereotype:
                    self._text_box(d, f"«{n.stereotype}»", n.x, yy, n.w, 13, n.font - 1, italic=True)
                    yy += 13
                self._text_box(d, n.header or n.text, n.x, yy, n.w, 15, n.font, bold=True)
                yy += 18
                d.line([(X, S(yy)), (X + W, S(yy))], fill=n.stroke, width=SCALE)
                f = _font(n.font - 1)
                for a in n.attrs:
                    d.text((X + S(5), S(yy + 2)), a, font=f, fill="#111111")
                    yy += 13.5
                if k == "class" and n.ops:
                    yy += 3
                    d.line([(X, S(yy)), (X + W, S(yy))], fill=n.stroke, width=SCALE)
                    for o in n.ops:
                        d.text((X + S(5), S(yy + 2)), o, font=f, fill="#111111")
                        yy += 13.5
            elif k == "state_start":
                d.ellipse([X, Y, X + W, Y + H], fill="#000000")
            elif k == "state_end":
                d.ellipse([X, Y, X + W, Y + H], outline="#000000", width=SCALE)
                g = S(4)
                d.ellipse([X + g, Y + g, X + W - g, Y + H - g], fill="#000000")
            elif k == "text":
                self._text_box(d, n.text, n.x, n.y, n.w, n.h, n.font, n.bold)
        img.save(path, dpi=(220, 220))

    @staticmethod
    def _along(pts, t):
        segs = list(zip(pts, pts[1:]))
        total = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs) or 1
        target = total * t
        acc = 0
        for a, b in segs:
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if acc + L >= target and L:
                r = (target - acc) / L
                return a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r
            acc += L
        return pts[-1]

    def save(self, folder):
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, self.name + ".drawio"), "w", encoding="utf-8") as fh:
            fh.write(self.to_drawio())
        png = os.path.join(folder, "png", self.name + ".png")
        os.makedirs(os.path.dirname(png), exist_ok=True)
        self.to_png(png)
        return png


# ---------------------------------------------------------------- layout helpers
def class_height(n_attrs, n_ops=0, stereo=False):
    return 3 + (13 if stereo else 0) + 18 + n_attrs * 13.5 + (6 + n_ops * 13.5 if n_ops else 0) + 6
