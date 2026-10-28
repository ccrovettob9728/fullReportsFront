This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) in your browser. For local UI development, you do not need to install or configure AWS Cognito:

1. On the login page, switch **Login ON** to **Login OFF**.
2. Browse the app without signing in. This development-only switch bypasses route login checks; it does not create a user session or test Google/Cognito.
3. Switch **Login ON** again to restore the login requirement.

This bypass is available only with `npm run dev`; it is not available in production. Cognito-backed sign-in and the Cognito role-management page require a real AWS User Pool and Google provider configuration.

## Cognito and Google sign-in

To test the real Google sign-in flow, copy `.env.example` to `.env.local` and fill in the Cognito User Pool values. In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Then configure AWS Cognito:

1. Create a User Pool app client with the authorization code grant, PKCE, and scopes `openid`, `email`, and `profile`. Use Cognito Managed Login branding so `prompt=select_account` is forwarded to Google. Do not create a client secret for this browser-based flow.
2. Configure Google as an identity provider in the User Pool, map Google's `email` and `name` attributes, and enable Google in the app client's identity providers.
3. Cognito creates a federated User Pool profile on the user's first Google sign-in. Google IdP access is controlled by enabling the provider on the app client; do not assign privileged groups automatically.
4. Configure the Hosted UI callback URL as `http://localhost:3000/api/auth/callback` and sign-out URL as `http://localhost:3000/login`. Add the production URLs before deploying.
5. Create Cognito groups named exactly `superadmin`, `admin`, `supervisor`, and `trabajador`. Set `SUPERADMIN_EMAIL` in `.env.local` to the Google account that should always be the superadmin. The configured email takes precedence over group membership and cannot be changed from the app. Users without one of these groups receive the `trabajador` role.
6. Set `COGNITO_DOMAIN` to the full HTTPS Hosted UI domain and use the matching region, User Pool ID, and app client ID in `.env.local`.
7. Give the application runtime AWS credentials with permission to run `cognito-idp:ListUsersInGroup`, `cognito-idp:ListUsers`, `cognito-idp:AdminListGroupsForUser`, `cognito-idp:AdminAddUserToGroup`, and `cognito-idp:AdminRemoveUserFromGroup` on this User Pool. Use the hosting platform's IAM role/credential mechanism; do not put AWS access keys in client code.

For local role-management API testing, set `AWS_PROFILE` in `.env.local` to the AWS CLI profile configured with IAM Identity Center (for example, `fullreports-dev`). Keep the SSO start URL, SSO region, account, and role in the local AWS CLI configuration, then authenticate with `aws sso login --profile fullreports-dev`. The profile must have access only to this User Pool. Never put AWS access keys in `.env.local` or expose them to browser code. Restart `npm run dev` after changing `.env.local`.

The application uses Cognito Hosted UI with Google federation, OAuth state and PKCE, and an `HttpOnly` session cookie. Role claims are taken from the verified Cognito ID token, with `SUPERADMIN_EMAIL` as the superadmin override. The **Roles** page is visible only to the superadmin and assigns Cognito groups to accounts that have signed in with Google at least once. Role changes take effect after the affected user signs in again and receives a new ID token. `superadmin` can access and manage all pages; `admin` can access all pages except role management; `supervisor` can access all current pages except configuration and role management; `trabajador` can access only dashboard, attendance, and activities. Workforce APIs authorize each operation on the server; page access alone does not grant access to data.

## Workforce data and worker accounts

Projects, worker-to-project assignments, project machinery, scheduled tasks, shifts, and activity logs are stored in DynamoDB so administrators and workers see the same data across accounts and devices. Configure `DYNAMODB_TABLE_NAME` in `.env.local` and in the production runtime. Create the table once from the repository root:

```powershell
aws cloudformation deploy --template-file infra/workforce-table.yaml --stack-name fullreports-workforce --parameter-overrides TableName=fullreports-workforce --profile fullreports-dev
```

Use the appropriate AWS CLI profile for your environment. The application's runtime role needs `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:Query`, and `dynamodb:TransactWriteItems` on the table and its `GSI1` index, in addition to the Cognito permissions listed above. Do not put AWS credentials in client code. Administrators create or migrate projects, assign accounts that have the `trabajador` role, maintain project machinery, and manage scheduled activities from the project/program pages. A worker can be assigned to only one project at a time.

Worker shift times are recorded by the server, and an open shift or activity is unique per worker. Attendance percentage is the share of weekdays (Monday-Friday) since the project's start date with a recorded shift. Recorded hours are elapsed time between clock-in and clock-out; an open shift is included live in the dashboard.

Signing out ends the app and Cognito sessions, but Cognito does not sign the user out of Google. The next sign-in request asks Google to show its account chooser. If Google still signs in automatically, verify that the User Pool uses Managed Login branding; Cognito's classic Hosted UI does not forward this prompt.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
