# SOXAI API Documentation

This repository contains the public documentation and OpenAPI specification for the SOXAI API.

Run `mint dev` for a local preview and `mint validate` before publishing changes.

## Support and access

The production-access form is pending configuration. `support.mdx` retains its embed template inside an MDX comment, so it is not rendered or loaded while unconfigured. MDX placeholders must use `{/* */}` comments; HTML comments do not protect them from the validation check. Production-access applications temporarily use `info@soxai.co.jp` with the subject `Production access request`. API usage questions use the same address until the public discussions forum is available.

Before enabling the Google Form, replace `FORM_ID` with its actual form ID, confirm the applicable privacy-policy URL, remove the surrounding MDX comment markers, replace the preparation notice with an invitation to apply, and remove the temporary email application instructions from both support sections. Keep the Google-processing disclosure and verify a test submission reaches the intended recipient. The form publication requirement remains incomplete until then.

## OpenAPI updates

`openapi-public.json` is generated from the web-api repository. Make schema and endpoint-description changes there, then regenerate with `python scripts/export_openapi.py --public --output openapi-public.json`. Do not maintain separate corrections in this repository. The publishing workflow replaces this artifact on subsequent releases.

## License and trademarks

SOXAI and the SOXAI logo are trademarks of SOXAI Inc.

The MIT License in this repository applies to the documentation. Use of the SOXAI API itself requires a separate application and is subject to applicable terms.
