This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Cognito and Google sign-in

Copy `.env.example` to `.env.local` and fill in the Cognito User Pool values. In AWS Cognito:

1. Create a User Pool app client with the authorization code grant, PKCE, and scopes `openid`, `email`, and `profile`. Do not create a client secret for this browser-based flow.
2. Configure Google as an identity provider in the User Pool, map Google's `email` and `name` attributes, and enable Google in the app client's identity providers.
3. Cognito creates a federated User Pool profile on the user's first Google sign-in. Google IdP access is controlled by enabling the provider on the app client; do not assign privileged groups automatically.
4. Configure the Hosted UI callback URL as `http://localhost:3000/api/auth/callback` and sign-out URL as `http://localhost:3000/login`. Add the production URLs before deploying.
5. Create Cognito groups named exactly `superadmin`, `admin`, `supervisor`, and `trabajador`. Assign privileged groups only to approved users. Users without one of these groups receive the `trabajador` role.
6. Set `COGNITO_DOMAIN` to the full HTTPS Hosted UI domain and use the matching region, User Pool ID, and app client ID in `.env.local`.

The application uses Cognito Hosted UI with Google federation, OAuth state and PKCE, and an `HttpOnly` session cookie. Role claims are taken from the verified Cognito ID token. `superadmin` and `admin` can access all pages; `supervisor` can access all current pages except configuration; `trabajador` can access dashboard, tasks, and reports. Add the same authorization check to any future data API or server action; page-level protection does not replace data-layer authorization.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
