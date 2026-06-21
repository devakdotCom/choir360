import json
import re
from pathlib import Path

import pdfplumber

PDF_PATH = Path("public/docs/jebathotta-jeyageethangal.pdf")
OUT_PATH = Path("src/data/jebathotta-jeyageethangal.ts")
CATEGORY = "Jebathotta Jeyageethangal"

BASE = {
    "f": "க", "q": "ங", "r": "ச", "Q": "ஞ", "l": "ட", "z": "ண",
    "j": "த", "e": "ந", "g": "ப", "k": "ம", "a": "ய", "u": "ர",
    "y": "ல", "t": "வ", "o": "ழ", "s": "ள", "w": "ற", "d": "ன",
    "[": "ஜ", "]": "ஸ", "\\": "ஷ", "`": "ஹ",
}

INDEPENDENT = {
    "m": "அ", "M": "ஆ", ",": "இ", "<": "ஈ", "c": "உ", "C": "ஊ",
    "v": "எ", "V": "ஏ", "I": "ஐ", "x": "ஒ", "X": "ஓ", "/": "ஃ",
}

SIGNS = {
    "h": "ா", "p": "ி", "P": "ீ", "{": "ு", "_": "ூ", "}": "ூ",
}

U_SERIES = {
    "F": "கு", "R": "சு", "L": "டு", "Z": "ணு", "J": "து", "E": "நு",
    "G": "பு", "K": "மு", "A": "யு", "U": "ரு", "Y": "லு", "T": "வு",
    "O": "ழு", "S": "ளு", "W": "று", "D": "னு",
}

UU_SERIES = {
    "F}": "கூ", "R}": "சூ", "L}": "டூ", "Z}": "ணூ", "J}": "தூ", "E}": "நூ",
    "G}": "பூ", "K}": "மூ", "A}": "யூ", "U}": "ரூ", "Y}": "லூ", "T}": "வூ",
    "O}": "ழூ", "S}": "ளூ", "W}": "றூ", "D}": "னூ",
}

NOISE_PREFIXES = (
    "1/9/2014",
    "Page ",
    "Back to",
    "Print This",
    "copyright",
    "© copyright",
    "Jebathotta Jeyageethangal Page",
    "http://",
    "https://",
)


def convert_bamini(text: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        nxt2 = text[i + 2] if i + 2 < len(text) else ""

        if ch + nxt in UU_SERIES:
            out.append(UU_SERIES[ch + nxt])
            i += 2
            continue

        if ch in ("n", "N", "i") and nxt in BASE:
            consonant = BASE[nxt]
            if ch == "n" and nxt2 == "h":
                out.append(consonant + "ொ")
                i += 3
                continue
            if ch == "N" and nxt2 == "h":
                out.append(consonant + "ோ")
                i += 3
                continue
            out.append(consonant + {"n": "ெ", "N": "ே", "i": "ை"}[ch])
            i += 2
            continue

        if ch in BASE:
            consonant = BASE[ch]
            if nxt == ";":
                out.append(consonant + "்")
                i += 2
                continue
            if nxt in SIGNS:
                out.append(consonant + SIGNS[nxt])
                i += 2
                continue
            out.append(consonant)
            i += 1
            continue

        if ch in U_SERIES:
            out.append(U_SERIES[ch])
            i += 1
            continue

        if ch in INDEPENDENT:
            out.append(INDEPENDENT[ch])
            i += 1
            continue

        if ch == ";":
            out.append("்")
        elif ch == ">":
            out.append(",")
        else:
            out.append(ch)
        i += 1

    return re.sub(r"\s+", " ", "".join(out)).strip()


def is_content_line(line: str) -> bool:
    line = line.strip()
    if not line:
        return False
    if any(line.startswith(prefix) for prefix in NOISE_PREFIXES):
        return False
    if re.match(r"^\d+[\).]", line):
        return False
    return bool(re.search(r"[A-Za-z\[\]\\;{}]", line))


def clean_lyrics_text(lines: list[str]) -> str:
    content = [line for line in lines if is_content_line(line)]
    return "\n".join(convert_bamini(line) for line in content).strip()


def first_title(lines: list[str], page_number: int) -> str:
    for line in lines:
        if is_content_line(line):
            title = convert_bamini(line)
            title = re.sub(r"\s*[-–].*$", "", title).strip()
            title = re.sub(r"\s*\(\d+\)\s*$", "", title).strip()
            if title:
                return title
    return f"Untitled Song - Page {page_number}"


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"Missing source PDF: {PDF_PATH}")

    records = []
    with pdfplumber.open(str(PDF_PATH)) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            raw_text = page.extract_text() or ""
            lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
            source_url = next(
                (line for line in lines if line.startswith("http://") or line.startswith("https://")),
                "",
            )
            title = first_title(lines, page_number)
            lyrics = clean_lyrics_text(lines)
            search_text = "\n".join([title, lyrics, CATEGORY, str(page_number), f"JJ{page_number:03d}", raw_text])

            records.append({
                "id": f"JJ{page_number:03d}",
                "title": title,
                "displayTitle": title,
                "lyricsTitle": title,
                "language": "Tamil",
                "album": CATEGORY,
                "composer": "Unknown",
                "singer": "Unknown",
                "category": CATEGORY,
                "source": "Imported PDF Song Library",
                "lyrics": lyrics,
                "sourcePdfUrl": "/docs/jebathotta-jeyageethangal.pdf",
                "sourcePageNumber": page_number,
                "pageNumber": page_number,
                "sourceUrl": source_url,
                "sourceSearchText": search_text,
            })

    OUT_PATH.write_text(
        "import { Song } from '../types';\n\n"
        "/**\n"
        " * Generated by scripts/generateJebathottaSongs.py from public/docs/jebathotta-jeyageethangal.pdf.\n"
        " */\n"
        f"export const JEBATHOTTA_JEYAGEETHANGAL_SONGS: Song[] = {json.dumps(records, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Generated {len(records)} songs at {OUT_PATH}")


if __name__ == "__main__":
    main()
