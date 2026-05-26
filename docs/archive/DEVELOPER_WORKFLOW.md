# 🛠️ Clip Aura: Professional Developer Workflow

This guide defines how we manage code to prevent accidental deletions, protect the production environment, and ensure high-quality releases.

---

## 1. Branching Strategy (Git Flow)

We use a structured branching model to keep the code organized.

| Branch | Purpose | Stability |
| :--- | :--- | :--- |
| **`main`** | **Production**. This is what your customers see. | 🟢 100% Stable |
| **`dev`** | **Integration**. This is where we combine new features. | 🟡 Testing |
| **`feature/*`** | **Task-specific**. Where the actual coding happens. | 🔴 Unstable |

### The Workflow:
1.  **Start a task**: Create a branch from `dev` (e.g., `git checkout -b feature/new-ui dev`).
2.  **Code & Commit**: Save your work often in that branch.
3.  **Merge to `dev`**: Once the feature works, merge it into `dev` for testing.
4.  **Release to `main`**: Once `dev` is fully tested, merge `dev` into `main` to launch.

---

## 2. Commit Standards

Use meaningful commit messages so we can "travel back in time" if something breaks:
*   `feat:` for new features (e.g., `feat: add google auth`)
*   `fix:` for bug fixes (e.g., `fix: pricing modal alignment`)
*   `docs:` for documentation changes
*   `refactor:` for code cleanups

---

## 3. Safety Rules (The Golden Rules)

1.  **Never push secrets**: Ensure `.env` is always in `.gitignore`.
2.  **Test before merging**: Run `docker-compose up` and verify the UI before merging into `dev`.
3.  **No `main` force-pushes**: Never overwrite the `main` history. It is our "Source of Truth."
4.  **Database Backups**: Regularly copy `clip_aura.db` to a secure backup folder before running migrations.

---

## 4. Environment Management

*   **Development**: Use `docker-compose.yml` locally.
*   **Production**: Use a separate VPS/GPU server with its own `.env` file and production-optimized Docker settings.
