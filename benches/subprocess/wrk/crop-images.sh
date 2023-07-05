#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo -e "\n[*] CROP IMAGES"
for filename in $SCRIPT_DIR/images/*; do
    basename=$( basename "$filename" )
    if [[ $basename != cropped-* ]]; then
        pdfcrop "$filename" "$( dirname "$filename" )/cropped-$basename"
    fi
done
