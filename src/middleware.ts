// Path: src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/overview",
    "/assets/:path*",
    "/assignments/:path*",
    "/maintenance/:path*",
    "/alerts/:path*",
    "/bookings/:path*",
    "/calendar/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/migrate/:path*",
    "/api/assets/:path*",
    "/api/assignments/:path*",
    "/api/maintenance/:path*",
    "/api/bookings/:path*",
    "/api/export/:path*",
    "/api/users/:path*",
    "/api/migrate/:path*",
  ],
};
