<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All raffle constants and contact data live in src/config.ts; never hardcode them elsewhere (single source of truth).
- Sheet data goes through the existing Google Apps Script endpoint via src/lib/raffle.ts; numbers are integers 0–99, padded only for display.
