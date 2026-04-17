import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/_index.tsx"),
	route("hazard-map", "routes/hazard-map.tsx"),
	route("education", "routes/education.tsx"),
] satisfies RouteConfig;
