"""BPMN layout helper: one pool with lanes (columns x lanes grid) plus collapsed external pools."""
from dg import Diagram

TASK_W, TASK_H = 118, 54
EV = 34
GW = 44


class BP:
    def __init__(self, name, title, lanes, cols, colw=140, pool="CasEYE's", ext_top=(), ext_bottom=(), left=10, top=10):
        self.colw = colw
        width = left + 56 + 20 + cols * colw + 50
        y = top
        self.ext = {}
        ext_h = 46
        heights = sum(h for _, _, h in lanes)
        total_h = top + len(ext_top) * (ext_h + 30) + heights + len(ext_bottom) * (ext_h + 30) + 10
        self.d = Diagram(name, width + left, total_h, title)
        for key, label in ext_top:
            self.ext[key] = self.d.add(key, "rect", left, y, width - left, ext_h, label, bold=True, fill="#F4F1FB")
            y += ext_h + 30
        self.d.add("POOL", "pool", left, y, width - left, heights, pool, bold=True)
        self.lane = {}
        ly = y
        for key, label, h in lanes:
            self.lane[key] = (ly, h)
            self.d.add("LANE_" + key, "lane", left + 28, ly, width - left - 28, h, label)
            ly += h
        y = ly + 30
        for key, label in ext_bottom:
            self.ext[key] = self.d.add(key, "rect", left, y, width - left, ext_h, label, bold=True, fill="#F4F1FB")
            y += ext_h + 30
        self.x0 = left + 56 + 20

    def _c(self, lane, col, dy):
        ly, h = self.lane[lane]
        return self.x0 + col * self.colw + self.colw / 2, ly + h / 2 + dy

    def task(self, id, lane, col, text, dy=0, w=TASK_W, h=TASK_H, **kw):
        cx, cy = self._c(lane, col, dy)
        return self.d.add(id, "task", cx - w / 2, cy - h / 2, w, h, text, font=10, **kw)

    def ev(self, id, kind, lane, col, text="", dy=0):
        cx, cy = self._c(lane, col, dy)
        return self.d.add(id, kind, cx - EV / 2, cy - EV / 2, EV, EV, text, font=10)

    def gw(self, id, lane, col, text="", dy=0, kind="gw_x"):
        cx, cy = self._c(lane, col, dy)
        return self.d.add(id, kind, cx - GW / 2, cy - GW / 2, GW, GW, text, font=10)

    def note(self, id, lane, col, text, dy=0, w=120, h=34):
        cx, cy = self._c(lane, col, dy)
        return self.d.add(id, "note", cx - w / 2, cy - h / 2, w, h, text, font=9)

    def f(self, a, b, text="", **kw):
        kw.setdefault("label_at", 0.3 if text else 0.5)
        return self.d.edge(a, b, text, "seq", **kw)

    def m(self, a, b, text="", **kw):
        return self.d.edge(a, b, text, "msg", **kw)
