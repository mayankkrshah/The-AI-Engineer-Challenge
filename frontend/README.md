# FastAPI Chat Frontend

This is a Next.js frontend application built with Material UI to consume a FastAPI backend.

## Setup

1.  **Start the FastAPI Backend:**
    Navigate to the `api` directory in your terminal and run:
    ```bash
    uvicorn app:app --reload
    ```
    The backend should be running at `http://localhost:8000`.

2.  **Install Frontend Dependencies:**
    Navigate to the `frontend` directory in your terminal and run:
    ```bash
    npm install
    ```

3.  **Run the Frontend Application:**
    While still in the `frontend` directory, run:
    ```bash
    npm run dev
    ```
    The frontend application should be accessible at `http://localhost:3000`.

## Development

- The main chat interface is located in `frontend/src/app/page.tsx`.
- Material UI theme is defined in `frontend/src/app/theme.ts`.
- Material UI integration with Next.js App Router is handled in `frontend/src/app/layout.tsx`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
