const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://clerk.lendloop.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
