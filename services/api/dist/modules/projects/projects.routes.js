"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const appCheck_middleware_1 = require("../../middlewares/appCheck.middleware");
const projects_controller_1 = require("./projects.controller");
exports.projectsRouter = (0, express_1.Router)({ mergeParams: true });
// Admin routes (tenant scoped via query or legacy param)
exports.projectsRouter.post("/admin/projects", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.createProjectHandler);
exports.projectsRouter.get("/admin/projects", auth_middleware_1.authMiddleware, projects_controller_1.listProjectsHandler);
exports.projectsRouter.get("/admin/projects/:projectId", auth_middleware_1.authMiddleware, projects_controller_1.getProjectHandler);
exports.projectsRouter.put("/admin/projects/:projectId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.updateProjectHandler);
exports.projectsRouter.delete("/admin/projects/:projectId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.deleteProjectHandler);
exports.projectsRouter.post("/admin/projects/:projectId/publish", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.publishProjectHandler);
exports.projectsRouter.post("/admin/projects/:projectId/unpublish", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.unpublishProjectHandler);
exports.projectsRouter.post("/admin/projects/:projectId/units", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.createUnitHandler);
exports.projectsRouter.get("/admin/projects/:projectId/units", auth_middleware_1.authMiddleware, projects_controller_1.listUnitsHandler);
exports.projectsRouter.put("/admin/projects/:projectId/units/:unitId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.updateUnitHandler);
exports.projectsRouter.delete("/admin/projects/:projectId/units/:unitId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.deleteUnitHandler);
// Legacy tenant-scoped routes (compat)
exports.projectsRouter.post("/tenants/:tenantId/projects", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.createProjectHandler);
exports.projectsRouter.get("/tenants/:tenantId/projects", auth_middleware_1.authMiddleware, projects_controller_1.listProjectsHandler);
exports.projectsRouter.get("/tenants/:tenantId/projects/:projectId", auth_middleware_1.authMiddleware, projects_controller_1.getProjectHandler);
exports.projectsRouter.put("/tenants/:tenantId/projects/:projectId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.updateProjectHandler);
exports.projectsRouter.delete("/tenants/:tenantId/projects/:projectId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.deleteProjectHandler);
exports.projectsRouter.post("/tenants/:tenantId/projects/:projectId/publish", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.publishProjectHandler);
exports.projectsRouter.post("/tenants/:tenantId/projects/:projectId/unpublish", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.unpublishProjectHandler);
exports.projectsRouter.post("/tenants/:tenantId/projects/:projectId/units", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.createUnitHandler);
exports.projectsRouter.get("/tenants/:tenantId/projects/:projectId/units", auth_middleware_1.authMiddleware, projects_controller_1.listUnitsHandler);
exports.projectsRouter.put("/tenants/:tenantId/projects/:projectId/units/:unitId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.updateUnitHandler);
exports.projectsRouter.delete("/tenants/:tenantId/projects/:projectId/units/:unitId", auth_middleware_1.authMiddleware, appCheck_middleware_1.requireAppCheckForWrites, projects_controller_1.deleteUnitHandler);
// Public routes
exports.projectsRouter.get("/public/projects", projects_controller_1.publicListProjectsHandler);
exports.projectsRouter.get("/public/projects/:slug", projects_controller_1.publicGetProjectHandler);
exports.projectsRouter.get("/public/projects/:slug/units", projects_controller_1.publicListProjectUnitsHandler);
