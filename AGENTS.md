# Instructions for coding agents

## Project context and scope

- Read `docs/game-design.md` before changing gameplay or architecture. It contains
  the game rules, intended structure, technical specification, and roadmap.
- Read `README.md` for current implementation status and development commands.
  Read `docs/backend.md` when working on the backend's API or simulation.
- Treat the specification as project context and design constraints. Implement
  only the requested scope; roadmap entries describe future work and do not
  authorize implementing every feature.
- Keep gameplay calculations authoritative in the Python backend. Keep the
  architecture lightweight and complete Station Alpha before expanding stations.

## General workflow

- Prefer simple, maintainable solutions.
- Do not add dependencies unless necessary.
- Run relevant tests after making changes.
- Do not modify generated files manually.
- Follow existing code style and architecture.
- Before large refactors, explain the intended approach.
- Update the README and relevant documentation when behavior or setup changes.
