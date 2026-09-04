# Lean development rules

Adapted from the MIT-licensed [Ponytail](https://github.com/DietrichGebert/ponytail) project.

Before adding code, stop at the first option that works:

1. Skip speculative work.
2. Reuse an existing helper, component, type, or pattern.
3. Prefer the standard library.
4. Prefer native browser and platform features.
5. Reuse an installed dependency.
6. Write the smallest complete change.

Trace the real flow before editing and fix shared root causes rather than individual symptoms. Do not add speculative abstractions, dependencies, configuration, or boilerplate. Never simplify away trust-boundary validation, data-loss prevention, security, accessibility, hardware cleanup, or explicit requirements. Non-trivial logic must leave one runnable regression check.
