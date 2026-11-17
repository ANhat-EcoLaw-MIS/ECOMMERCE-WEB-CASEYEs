"""Builds docs/report/Chuong3_Phan_tich_thiet_ke_he_thong.docx from the content modules.

Block DSL (lists of tuples):
  ("h1"|"h2"|"h3"|"h4", text)
  ("p", text)                      text may contain **bold** and {F:key} / {T:key} references
  ("bul", [text, ...])             bullet list
  ("num", [text, ...])             numbered list (1. 2. ...)
  ("table", key, caption, header, rows, widths_cm[, font_size])
  ("fig", key, png_name, caption, "p"|"l", width_cm)
  ("note", text)                   small italic note
  ("pb",)                          page break
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.join(HERE, "..", "diagrams", "png")
OUT = os.path.join(HERE, "..", "Chuong3_Phan_tich_thiet_ke_he_thong.docx")
FONT = "Times New Roman"
A4_W, A4_H = Cm(21), Cm(29.7)
MARGIN = Cm(2.54)


def number_refs(blocks):
    figs, tabs = {}, {}
    for b in blocks:
        if b[0] == "fig":
            figs[b[1]] = len(figs) + 1
        elif b[0] == "table":
            tabs[b[1]] = len(tabs) + 1
    return figs, tabs


def resolve(text, figs, tabs):
    def rep(m):
        kind, key = m.group(1), m.group(2)
        n = (figs if kind == "F" else tabs).get(key)
        if n is None:
            raise KeyError(f"unknown reference {kind}:{key}")
        return f"{'Hình' if kind == 'F' else 'Bảng'} 3.{n}"
    return re.sub(r"\{(F|T):([^}]+)\}", rep, text)


def set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def add_runs(par, text, size=None, italic=False, bold=False):
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    for part in parts:
        if not part:
            continue
        b = part.startswith("**") and part.endswith("**")
        run = par.add_run(part[2:-2] if b else part)
        if bold or b:
            run.bold = True
        if italic:
            run.italic = True
        run.font.name = FONT
        run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        if size:
            run.font.size = Pt(size)


def setup_styles(doc):
    st = doc.styles["Normal"]
    st.font.name = FONT
    st.font.size = Pt(13)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    pf = st.paragraph_format
    pf.space_after = Pt(6)
    pf.space_before = Pt(0)
    pf.line_spacing = 1.3
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    spec = {"Heading 1": (14, True, False, WD_ALIGN_PARAGRAPH.CENTER, 12, 12),
            "Heading 2": (13, True, False, WD_ALIGN_PARAGRAPH.LEFT, 12, 6),
            "Heading 3": (13, True, False, WD_ALIGN_PARAGRAPH.LEFT, 10, 6),
            "Heading 4": (13, True, True, WD_ALIGN_PARAGRAPH.LEFT, 8, 4)}
    for name, (size, bold, italic, align, before, after) in spec.items():
        s = doc.styles[name]
        s.font.name = FONT
        s.font.size = Pt(size)
        s.font.bold = bold
        s.font.italic = italic
        s.font.color.rgb = RGBColor(0, 0, 0)
        rpr = s.element.get_or_add_rPr()
        fonts = rpr.find(qn("w:rFonts"))
        if fonts is None:
            fonts = OxmlElement("w:rFonts")
            rpr.append(fonts)
        for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            fonts.set(qn(a), FONT)
        s.paragraph_format.alignment = align
        s.paragraph_format.space_before = Pt(before)
        s.paragraph_format.space_after = Pt(after)
        s.paragraph_format.keep_with_next = True
        s.paragraph_format.line_spacing = 1.2


def new_section(doc, landscape):
    sec = doc.add_section(WD_SECTION.NEW_PAGE)
    sec.orientation = WD_ORIENT.LANDSCAPE if landscape else WD_ORIENT.PORTRAIT
    sec.page_width, sec.page_height = (A4_H, A4_W) if landscape else (A4_W, A4_H)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, MARGIN)
    return sec


def caption(doc, text, before=True):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4 if before else 2)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = before
    add_runs(p, text, size=12, italic=not before, bold=before)


def build(blocks):
    figs, tabs = number_refs(blocks)
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = A4_W, A4_H
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, MARGIN)
    setup_styles(doc)
    landscape = False
    for b in blocks:
        kind = b[0]
        if kind in ("h1", "h2", "h3", "h4"):
            level = int(kind[1])
            h = doc.add_heading(level=level)
            add_runs(h, resolve(b[1], figs, tabs))
        elif kind == "p":
            p = doc.add_paragraph()
            add_runs(p, resolve(b[1], figs, tabs))
        elif kind == "note":
            p = doc.add_paragraph()
            add_runs(p, resolve(b[1], figs, tabs), size=11, italic=True)
        elif kind in ("bul", "num"):
            for i, item in enumerate(b[1], 1):
                p = doc.add_paragraph(style="List Bullet" if kind == "bul" else None)
                if kind == "num":
                    p.paragraph_format.left_indent = Cm(0.9)
                    p.paragraph_format.first_line_indent = Cm(-0.6)
                    add_runs(p, f"{i}. ")
                p.paragraph_format.space_after = Pt(3)
                add_runs(p, resolve(item, figs, tabs))
        elif kind == "pb":
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        elif kind == "table":
            key, cap, header, rows, widths = b[1:6]
            size = b[6] if len(b) > 6 else 11
            caption(doc, f"Bảng 3.{tabs[key]}. {cap}", before=True)
            t = doc.add_table(rows=1, cols=len(header))
            t.style = "Table Grid"
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            t.autofit = False
            for i, htxt in enumerate(header):
                c = t.rows[0].cells[i]
                c.width = Cm(widths[i])
                c.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
                c.paragraphs[0].paragraph_format.line_spacing = 1.1
                c.paragraphs[0].paragraph_format.space_after = Pt(0)
                add_runs(c.paragraphs[0], htxt, size=size, bold=True)
                set_cell_bg(c, "E8E1F5")
            # repeat header row on new pages
            trPr = t.rows[0]._tr.get_or_add_trPr()
            th = OxmlElement("w:tblHeader")
            th.set(qn("w:val"), "true")
            trPr.append(th)
            for row in rows:
                cells = t.add_row().cells
                for i, val in enumerate(row):
                    cells[i].width = Cm(widths[i])
                    lines = resolve(str(val), figs, tabs).split("\n")
                    par = cells[i].paragraphs[0]
                    for k, line in enumerate(lines):
                        if k:
                            par = cells[i].add_paragraph()
                        par.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        par.paragraph_format.line_spacing = 1.1
                        par.paragraph_format.space_after = Pt(1)
                        add_runs(par, line, size=size)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "fig":
            key, png, cap, orient, width = b[1:6]
            want_land = orient == "l"
            if want_land != landscape:
                new_section(doc, want_land)
                landscape = want_land
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.keep_with_next = True
            p.add_run().add_picture(os.path.join(PNG, png + ".png"), width=Cm(width))
            caption(doc, f"Hình 3.{figs[key]}. {cap}", before=False)
            if want_land:
                new_section(doc, False)
                landscape = False
        else:
            raise ValueError(kind)
    doc.save(OUT)
    return OUT


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    from content import BLOCKS
    print(build(BLOCKS))
