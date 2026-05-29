import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  return <div>Profile Works</div>;
}
