#!/usr/bin/env python3
"""Update the image tag in a Helm values file."""

import pathlib
import re
import sys


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} VALUES_FILE IMAGE_TAG")

    values = pathlib.Path(sys.argv[1])
    new_tag = sys.argv[2]
    lines = values.read_text().splitlines(keepends=True)
    in_image = False
    updated = False

    for index, line in enumerate(lines):
        if re.match(r"^image:\s*$", line):
            in_image = True
        elif in_image and line.strip() and not line.startswith(" "):
            in_image = False

        if in_image and re.match(r"^\s+tag:", line):
            newline = "\n" if line.endswith("\n") else ""
            lines[index] = re.sub(r"^(\s*tag:).*$", rf'\1 "{new_tag}"', line.rstrip("\n")) + newline
            updated = True
            break

    if not updated:
        raise SystemExit(f"image.tag was not found in {values}")

    values.write_text("".join(lines))
    print(f"bumped {values} image tag to {new_tag}")


if __name__ == "__main__":
    main()
