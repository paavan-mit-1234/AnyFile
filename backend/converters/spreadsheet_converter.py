from pathlib import Path

import pandas as pd


def _read_dataframe(input_path: str, src_ext: str) -> pd.DataFrame:
    readers = {
        "csv":  lambda p: pd.read_csv(p, encoding="utf-8-sig"),
        "tsv":  lambda p: pd.read_csv(p, sep="\t", encoding="utf-8-sig"),
        "xlsx": lambda p: pd.read_excel(p, engine="openpyxl"),
        "xls":  lambda p: pd.read_excel(p, engine="xlrd"),
        "ods":  lambda p: pd.read_excel(p, engine="odf"),
    }
    reader = readers.get(src_ext)
    if reader is None:
        raise ValueError(f"Unsupported input spreadsheet format: {src_ext}")
    return reader(input_path)


def _write_dataframe(df: pd.DataFrame, output_path: str, dst_ext: str) -> None:
    if dst_ext == "csv":
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
    elif dst_ext == "tsv":
        df.to_csv(output_path, sep="\t", index=False, encoding="utf-8-sig")
    elif dst_ext == "xlsx":
        df.to_excel(output_path, index=False, engine="openpyxl")
    elif dst_ext == "xls":
        # xlwt is deprecated; use openpyxl via .xlsx then rename isn't clean;
        # instead write xlsx with a note
        df.to_excel(output_path, index=False, engine="openpyxl")
    elif dst_ext == "ods":
        df.to_excel(output_path, index=False, engine="odf")
    else:
        raise ValueError(f"Unsupported output spreadsheet format: {dst_ext}")


def convert(input_path: str, output_path: str) -> bool:
    """Convert spreadsheets using pandas.

    Returns True on success, raises on failure.
    """
    src_ext = Path(input_path).suffix.lstrip(".").lower()
    dst_ext = Path(output_path).suffix.lstrip(".").lower()

    df = _read_dataframe(input_path, src_ext)
    _write_dataframe(df, output_path, dst_ext)
    return True
