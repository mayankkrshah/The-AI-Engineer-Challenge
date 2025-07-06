# MERGE INSTRUCTIONS: PDF Upload & Chat Feature

## Feature Summary
This branch implements the following:
- PDF upload button in the sidebar (frontend)
- Uploads PDF to backend, which indexes it using the `aimakerspace` library
- Enables chat with the PDF using a simple RAG (Retrieval-Augmented Generation) system
- All code is well-documented and follows branch development best practices

---

## How to Merge This Feature Branch to `main`

### 1. **Via GitHub Pull Request (Recommended)**
1. Push your branch to GitHub (if not already):
   ```sh
git push origin feature/s03-assignment-pdf-flow
   ```
2. Go to your repository on GitHub.
3. Click "Compare & pull request" for `feature/s03-assignment-pdf-flow`.
4. Review the changes, add a description, and create the pull request.
5. After review, click "Merge pull request".

### 2. **Via GitHub CLI**
1. Make sure you have the GitHub CLI installed (`gh`).
2. Push your branch (if not already):
   ```sh
git push origin feature/s03-assignment-pdf-flow
   ```
3. Create a pull request from the CLI:
   ```sh
gh pr create --base main --head feature/s03-assignment-pdf-flow --fill
   ```
4. Merge the pull request from the CLI:
   ```sh
gh pr merge --merge
   ```

---

## After Merging
- Pull the latest `main` branch to your local machine:
  ```sh
git checkout main
git pull origin main
  ```
- Delete the feature branch if desired:
  ```sh
git branch -d feature/s03-assignment-pdf-flow
git push origin --delete feature/s03-assignment-pdf-flow
  ```

---

## Questions?
If you have any issues or questions, please refer to the project README or contact the code author. 