# Third-party data and libraries

## Spelling dictionary — SCOWL word lists (via the `wordlist-english` npm package)

The writing corrector's dictionary is built at build time from the SCOWL word lists
(sizes 10–50, English / American / Canadian / British), distributed in the `wordlist-english` package.

    Copyright 2000-2016 by Kevin Atkinson

    Permission to use, copy, modify, distribute and sell these word
    lists, the associated scripts, the output created from the scripts,
    and its documentation for any purpose is hereby granted without fee,
    provided that the above copyright notice appears in all copies and
    that both that copyright notice and this permission notice appear in
    supporting documentation. Kevin Atkinson makes no representations
    about the suitability of this array for any purpose. It is provided
    "as is" without express or implied warranty.

The full notice (including the copyrights of the sources SCOWL is derived from) is in
`node_modules/wordlist-english/Copyright` after `npm install`.

## Anthropic TypeScript SDK (`@anthropic-ai/sdk`)

Bundled into the page for the optional AI correction. MIT License, © Anthropic, PBC.

## esbuild, playwright-core

Build and test tools only (not shipped in the page). MIT / Apache-2.0.
