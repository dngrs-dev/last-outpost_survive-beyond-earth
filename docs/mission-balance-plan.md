# Mission readiness and difficulty

- [x] Milestone 1: enforce objective equipment at launch; publish requirements; regenerate contracts and fixtures.
- [x] Milestone 2: backend-only seeded simulations, policy comparisons, measured difficulty and balance tuning.
- [ ] Milestone 3: simplify packing and incident UI; mandatory incident response; relevant checks.

Atomic weekly submissions and exact request retries remain unchanged. Each milestone is committed separately.

Success means operational relief (`successful_handover` or `perfect_handover`). Survival, full-crew survival, science and the 0-3 star distribution are measured separately. Desired 95%/5% difficulty anchors are design goals under a stated policy, not claims about children.

Research: [difficulty/skill study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9890114/) cautions against treating a win rate as enjoyment; [difficulty modelling](https://arxiv.org/abs/2107.03305) supports examining more than binary wins; [NIST](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) describes Wilson intervals for measured proportions. Actual child playtests remain necessary.

Milestone 1 validation: 437 backend tests, Ruff, frontend production build and targeted packing/station tests. Fixtures regenerated through FastAPI.

Milestone 2: 2,400 frozen validation campaigns (seeds 30000-30199), 437 existing backend tests plus 26 new balance tests, full frontend regression suite, regenerated fixtures. See [methodology and measured rates](mission-balance.md).
