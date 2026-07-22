#!/bin/bash
# ============================================================================
# MLIMS Phase 6: Anonymization Script
#
# Scrubs PII from patients and deceased_identifications in a dumped SQL file
# before loading it into lower environments (dev/test).
# WARNING: This does a naive regex replacement on the plain text SQL dump.
# ============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <input_dump.sql> <output_dump.sql>"
    exit 1
fi

INPUT_FILE=$1
OUTPUT_FILE=$2

echo "Anonymizing $INPUT_FILE into $OUTPUT_FILE..."

# In a real enterprise system, anonymization should ideally happen at the database level 
# (e.g. creating a sanitized snapshot) rather than grepping text files, but for a 
# simple schema, sed replacements on the COPY blocks work.

# Replace patient full names with 'Anonymized Patient'
# Assuming standard PostgreSQL COPY format: COPY patients (...) FROM stdin;
# This sed script matches the COPY data block for patients and replaces the name column.
# Note: A robust implementation requires a proper data masking tool (like postgresql-anonymizer).

sed -e '/^COPY public.patients /,/^\\\./ s/[A-Za-z \.]*\t[A-Za-z \.]*\t/Anonymized Patient\t/g' \
    -e '/^COPY public.deceased_identifications /,/^\\\./ s/identified_by_name\t[A-Za-z \.]*\t/identified_by_name\tAnonymized Informant\t/g' \
    -e 's/[0-9]\{9\}[Vv]\|[0-9]\{12\}/000000000000/g' \
    "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Anonymization complete. Note: Encryption salts and AES keys must NOT be synced to dev."
