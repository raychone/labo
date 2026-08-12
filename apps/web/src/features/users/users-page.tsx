import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmActionModal,
  DataTable,
  Drawer,
  ErrorState,
  FormActions,
  FormErrorSummary,
  FormLayout,
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  TextInput,
  useToast,
  type DataTableColumn,
  type DataTableSort,
} from "@dental-lab/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { fetchPermissions } from "../auth/auth-api.js";
import {
  createUser,
  disableUser,
  enableUser,
  fetchRoles,
  fetchUser,
  fetchUsers,
  hasPermission,
  replaceUserRoles,
  resetUserPassword,
  updateUser,
  type CreateUserInput,
  type RoleOption,
  type UserDetail,
  type UserSummary,
  type UpdateUserInput,
  type UsersListParams,
} from "./users-api.js";
import {
  createUserSchema,
  resetPasswordSchema,
  userBaseSchema,
  type CreateUserFormValues,
  type ResetPasswordFormValues,
  type UserBaseFormValues,
} from "./users-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./users-page.css";

const pageSize = 10;

const defaultListParams: UsersListParams = {
  isActive: undefined,
  page: 1,
  pageSize,
  roleKey: undefined,
  search: undefined,
  sortBy: "createdAt",
  sortDirection: "desc",
};

function toRoleFilterOptions(roles: readonly RoleOption[]) {
  return [
    { label: "Toate rolurile", value: "" },
    ...roles.map((role) => ({ label: role.name, value: role.key })),
  ];
}

function toStatusOptions() {
  return [
    { label: "Toti", value: "" },
    { label: "Activi", value: "true" },
    { label: "Dezactivati", value: "false" },
  ];
}

function roleKeysFromUser(user: UserSummary | UserDetail | undefined): readonly string[] {
  return user?.roles.map((role) => role.key).sort() ?? [];
}

function toCreateUserInput(values: CreateUserFormValues): CreateUserInput {
  const { preferredColor, ...rest } = values;
  return preferredColor === undefined || preferredColor === "" ? rest : { ...rest, preferredColor };
}

function toUpdateUserInput(values: UserBaseFormValues): UpdateUserInput {
  const { preferredColor, ...rest } = values;
  return preferredColor === undefined || preferredColor === "" ? rest : { ...rest, preferredColor };
}

const userFieldLabels: Record<keyof UserBaseFormValues, string> = {
  displayName: "Nume",
  email: "Email",
  preferredColor: "Culoare",
};

const createUserFieldLabels: Record<keyof CreateUserFormValues, string> = {
  displayName: "Nume",
  email: "Email",
  isActive: "Cont activ",
  preferredColor: "Culoare",
  roleKeys: "Roluri",
  temporaryPassword: "Parola temporara",
};

const resetPasswordFieldLabels: Record<keyof ResetPasswordFormValues, string> = {
  confirmTemporaryPassword: "Confirma parola temporara",
  temporaryPassword: "Parola temporara",
};

export function UsersPage(): ReactNode {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useState<UsersListParams>(defaultListParams);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isDisableOpen, setDisableOpen] = useState(false);
  const [isResetOpen, setResetOpen] = useState(false);

  const permissionsQuery = useQuery({
    queryFn: fetchPermissions,
    queryKey: ["auth", "permissions"],
    retry: false,
  });
  const rolesQuery = useQuery({
    queryFn: fetchRoles,
    queryKey: ["rbac", "roles"],
    retry: false,
  });
  const usersQuery = useQuery({
    queryFn: () => fetchUsers(params),
    queryKey: ["users", "list", params],
    retry: false,
  });
  const userDetailQuery = useQuery({
    enabled: selectedUserId !== null,
    queryFn: () => fetchUser(selectedUserId ?? ""),
    queryKey: ["users", "detail", selectedUserId],
    retry: false,
  });
  const permissions = permissionsQuery.data;
  const canCreate = hasPermission(permissions, "users.create");
  const canUpdate = hasPermission(permissions, "users.update");
  const canDisable = hasPermission(permissions, "users.disable");
  const canAssignRoles = hasPermission(permissions, "users.assign_roles");
  const roles = rolesQuery.data ?? [];
  const selectedUser = userDetailQuery.data;

  async function refreshUsers(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateUserFormValues) => createUser(toCreateUserInput(input)),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Utilizatorul nu a fost creat", variant: "error" }),
    onSuccess: async () => {
      setCreateOpen(false);
      toast.showToast({ durationMs: 3500, message: "Utilizator creat.", variant: "success" });
      await refreshUsers();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (input: UserBaseFormValues) => updateUser(selectedUserId ?? "", toUpdateUserInput(input)),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Datele nu au fost salvate", variant: "error" }),
    onSuccess: async () => {
      toast.showToast({ durationMs: 3500, message: "Utilizator actualizat.", variant: "success" });
      await refreshUsers();
    },
  });
  const roleMutation = useMutation({
    mutationFn: (roleKeys: readonly string[]) => replaceUserRoles(selectedUserId ?? "", roleKeys),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Rolurile nu au fost salvate", variant: "error" }),
    onSuccess: async () => {
      toast.showToast({ durationMs: 3500, message: "Roluri actualizate.", variant: "success" });
      await refreshUsers();
    },
  });
  const disableMutation = useMutation({
    mutationFn: () => disableUser(selectedUserId ?? ""),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Utilizatorul nu a fost dezactivat", variant: "error" }),
    onSuccess: async () => {
      setDisableOpen(false);
      toast.showToast({ durationMs: 3500, message: "Utilizator dezactivat.", variant: "success" });
      await refreshUsers();
    },
  });
  const enableMutation = useMutation({
    mutationFn: () => enableUser(selectedUserId ?? ""),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Utilizatorul nu a fost reactivat", variant: "error" }),
    onSuccess: async () => {
      toast.showToast({ durationMs: 3500, message: "Utilizator reactivat.", variant: "success" });
      await refreshUsers();
    },
  });
  const resetMutation = useMutation({
    mutationFn: (input: ResetPasswordFormValues) => resetUserPassword(selectedUserId ?? "", input.temporaryPassword),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Parola nu a fost resetata", variant: "error" }),
    onSuccess: async () => {
      setResetOpen(false);
      toast.showToast({ durationMs: 3500, message: "Parola temporara a fost setata.", variant: "success" });
      await refreshUsers();
    },
  });

  const columns = useMemo<readonly DataTableColumn<UserSummary>[]>(() => [
    {
      header: "Nume",
      id: "displayName",
      isSortable: true,
      renderCell: (user) => (
        <div>
          <strong>{user.displayName}</strong>
          <div className="users-page__muted">{user.email}</div>
        </div>
      ),
    },
    {
      header: "Status",
      id: "isActive",
      renderCell: (user) => (
        <StatusBadge label={user.isActive ? "Activ" : "Dezactivat"} variant={user.isActive ? "approved" : "rejected"} />
      ),
    },
    {
      header: "Roluri",
      id: "roles",
      renderCell: (user) => (
        <span>{user.roles.length > 0 ? user.roles.map((role) => role.name).join(", ") : "Fara rol"}</span>
      ),
    },
    {
      header: "Parola",
      id: "mustChangePassword",
      renderCell: (user) => user.mustChangePassword ? "Schimbare necesara" : "OK",
    },
  ], []);
  const sort: DataTableSort = {
    columnId: params.sortBy,
    direction: params.sortDirection === "asc" ? "ascending" : "descending",
  };

  return (
    <main className="users-page">
      <section className="dl-container users-page__layout" aria-labelledby="users-title">
        <header className="users-page__header">
          <div>
            <h1 id="users-title">Utilizatori</h1>
            <p>Administrare conturi interne, roluri, status și resetare parolă.</p>
          </div>
          {canCreate ? <Button onClick={() => setCreateOpen(true)}>Adaugă utilizator</Button> : null}
        </header>

        <Card>
          <CardHeader className="users-page__panel-header">
            <div>
              <CardTitle>Lista utilizatori</CardTitle>
              <CardDescription>{usersQuery.data?.total ?? 0} conturi găsite</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="users-page__panel">
            <div className="users-page__toolbar">
              <TextInput
                label="Căutare"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value }))}
                placeholder="Nume sau email"
                type="search"
                value={params.search ?? ""}
              />
              <Select
                label="Status"
                onChange={(event) => {
                  const value = event.target.value;
                  setParams((current) => ({ ...current, isActive: value === "" ? undefined : value === "true", page: 1 }));
                }}
                options={toStatusOptions()}
                value={params.isActive === undefined ? "" : String(params.isActive)}
              />
              <Select
                label="Rol"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, roleKey: event.target.value || undefined }))}
                options={toRoleFilterOptions(roles)}
                value={params.roleKey ?? ""}
              />
            </div>

            <DataTable
              columns={columns}
              emptyMessage="Nu există utilizatori pentru filtrele curente."
              error={usersQuery.isError ? getErrorMessage(usersQuery.error) : undefined}
              getRowKey={(user) => user.id}
              isLoading={usersQuery.isLoading}
              onRowAction={(user) => setSelectedUserId(user.id)}
              onSortChange={(nextSort) => {
                const sortableColumn = nextSort.columnId === "displayName" ? "displayName" : "createdAt";
                setParams((current) => ({
                  ...current,
                  page: 1,
                  sortBy: sortableColumn,
                  sortDirection: nextSort.direction === "ascending" ? "asc" : "desc",
                }));
              }}
              pagination={{
                onPageChange: (page) => setParams((current) => ({ ...current, page })),
                page: usersQuery.data?.page ?? params.page,
                pageCount: usersQuery.data?.pageCount ?? 1,
              }}
              rowActionLabel="Deschide"
              rows={usersQuery.data?.items ?? []}
              sort={sort}
            />
          </CardContent>
        </Card>
      </section>

      <CreateUserModal
        isOpen={isCreateOpen}
        isSubmitting={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(input) => createMutation.mutate(input)}
        roles={roles}
        submitError={createMutation.error}
      />

      <UserDetailsDrawer
        canAssignRoles={canAssignRoles}
        canDisable={canDisable}
        canUpdate={canUpdate}
        isEnableLoading={enableMutation.isPending}
        isOpen={selectedUserId !== null}
        isRoleLoading={roleMutation.isPending}
        isSubmitting={updateMutation.isPending}
        onDisable={() => setDisableOpen(true)}
        onEnable={() => enableMutation.mutate()}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedUserId(null);
          }
        }}
        onResetPassword={() => setResetOpen(true)}
        onRolesSubmit={(roleKeys) => roleMutation.mutate(roleKeys)}
        onSubmit={(input) => updateMutation.mutate(input)}
        roles={roles}
        submitError={updateMutation.error}
        user={selectedUser}
        userError={userDetailQuery.error}
        userLoading={userDetailQuery.isLoading}
      />

      <ConfirmActionModal
        confirmLabel="Dezactivează"
        description={`${selectedUser?.displayName ?? "Utilizatorul selectat"} nu va mai putea folosi aplicația. Sesiunile active vor fi invalidate imediat.`}
        isLoading={disableMutation.isPending}
        isOpen={isDisableOpen}
        onCancel={() => setDisableOpen(false)}
        onConfirm={() => disableMutation.mutate()}
        title="Dezactivezi utilizatorul?"
      />

      <ResetPasswordModal
        isOpen={isResetOpen}
        isSubmitting={resetMutation.isPending}
        onOpenChange={setResetOpen}
        onSubmit={(input) => resetMutation.mutate(input)}
        submitError={resetMutation.error}
      />
    </main>
  );
}

function CreateUserModal({
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  roles,
  submitError,
}: {
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: CreateUserFormValues) => void;
  readonly roles: readonly RoleOption[];
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<CreateUserFormValues>({
    defaultValues: {
      displayName: "",
      email: "",
      isActive: true,
      preferredColor: "",
      roleKeys: [],
      temporaryPassword: "",
    },
    resolver: zodResolver(createUserSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, createUserFieldLabels)
    : [];
  const closeGuard = useCloseGuard(form.formState.isDirty, isSubmitting, onOpenChange);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSubmitting);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSubmitting} />
      <Modal isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} title="Adaugă utilizator">
        <FormLayout
          className="users-page__form"
          onSubmit={(event) => void form.handleSubmit((values) => {
            form.clearErrors("root");
            onSubmit(values);
          })(event)}
        >
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <TextInput error={form.formState.errors.displayName?.message} id="displayName" label="Nume" required {...form.register("displayName")} />
          <TextInput error={form.formState.errors.email?.message} id="email" label="Email" required type="email" {...form.register("email")} />
          <TextInput
            error={form.formState.errors.preferredColor?.message}
            hint="Opțional. Cod hex, de exemplu #0f766e."
            id="preferredColor"
            label="Culoare"
            placeholder="#0f766e"
            {...form.register("preferredColor")}
          />
          <TextInput
            error={form.formState.errors.temporaryPassword?.message}
            id="temporaryPassword"
            label="Parolă temporară"
            required
            type="password"
            {...form.register("temporaryPassword")}
          />
          <Checkbox label="Cont activ" {...form.register("isActive")} />
          <RoleCheckboxes
            onRoleKeysChange={(roleKeys) => form.setValue("roleKeys", roleKeys, { shouldDirty: true })}
            roleKeys={form.watch("roleKeys")}
            roles={roles}
          />
          <FormActions canReset={form.formState.isDirty} isSubmitting={isSubmitting} onReset={() => form.reset()} submitLabel="Creează" />
        </FormLayout>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}

function UserDetailsDrawer({
  canAssignRoles,
  canDisable,
  canUpdate,
  isEnableLoading,
  isOpen,
  isRoleLoading,
  isSubmitting,
  onDisable,
  onEnable,
  onOpenChange,
  onResetPassword,
  onRolesSubmit,
  onSubmit,
  roles,
  submitError,
  user,
  userError,
  userLoading,
}: {
  readonly canAssignRoles: boolean;
  readonly canDisable: boolean;
  readonly canUpdate: boolean;
  readonly isEnableLoading: boolean;
  readonly isOpen: boolean;
  readonly isRoleLoading: boolean;
  readonly isSubmitting: boolean;
  readonly onDisable: () => void;
  readonly onEnable: () => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onResetPassword: () => void;
  readonly onRolesSubmit: (roleKeys: readonly string[]) => void;
  readonly onSubmit: (input: UserBaseFormValues) => void;
  readonly roles: readonly RoleOption[];
  readonly submitError: unknown;
  readonly user: UserDetail | undefined;
  readonly userError: unknown;
  readonly userLoading: boolean;
}): ReactNode {
  const form = useForm<UserBaseFormValues>({
    defaultValues: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      preferredColor: user?.preferredColor ?? "",
    },
    resolver: zodResolver(userBaseSchema),
    values: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      preferredColor: user?.preferredColor ?? "",
    },
  });
  const rolesForm = useForm<{ readonly roleKeys: readonly string[] }>({
    defaultValues: { roleKeys: roleKeysFromUser(user) },
    values: { roleKeys: roleKeysFromUser(user) },
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, userFieldLabels)
    : [];
  const closeGuard = useCloseGuard(form.formState.isDirty || rolesForm.formState.isDirty, isSubmitting || isRoleLoading, onOpenChange);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && (form.formState.isDirty || rolesForm.formState.isDirty) && !isSubmitting && !isRoleLoading);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && (form.formState.isDirty || rolesForm.formState.isDirty) && !isSubmitting && !isRoleLoading} />
      <Drawer isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} title={user?.displayName ?? "Utilizator"}>
        {userLoading ? <LoadingState text="Se încarcă utilizatorul" /> : null}
        {userError ? <ErrorState title="Utilizator indisponibil" description={getErrorMessage(userError)} /> : null}
        {user ? (
          <div className="users-page__drawer">
            <dl className="users-page__details">
              <div><dt>Status</dt><dd>{user.isActive ? "Activ" : "Dezactivat"}</dd></div>
              <div><dt>Sesiuni active</dt><dd>{user.activeSessionCount}</dd></div>
              <div><dt>Parola</dt><dd>{user.mustChangePassword ? "Schimbare necesară" : "OK"}</dd></div>
              <div><dt>Culoare</dt><dd>{user.preferredColor ? <span className="users-page__color-swatch" style={{ backgroundColor: user.preferredColor }} /> : "Nesetată"}</dd></div>
            </dl>

            {canUpdate ? (
              <FormLayout
                className="users-page__form"
                onSubmit={(event) => void form.handleSubmit((values) => {
                  form.clearErrors("root");
                  onSubmit(values);
                })(event)}
              >
                <FormErrorSummary errors={summaryItems} ref={summaryRef} />
                <TextInput error={form.formState.errors.displayName?.message} id="displayName" label="Nume" required {...form.register("displayName")} />
                <TextInput error={form.formState.errors.email?.message} id="email" label="Email" required type="email" {...form.register("email")} />
                <TextInput
                  error={form.formState.errors.preferredColor?.message}
                  hint="Opțional. Cod hex, de exemplu #0f766e."
                  id="preferredColor"
                  label="Culoare"
                  placeholder="#0f766e"
                  {...form.register("preferredColor")}
                />
                <FormActions
                  canReset={form.formState.isDirty}
                  isSubmitting={isSubmitting}
                  onReset={() => form.reset({ displayName: user.displayName, email: user.email, preferredColor: user.preferredColor ?? "" })}
                  submitDisabled={!form.formState.isDirty}
                  submitLabel="Salvează datele"
                />
              </FormLayout>
            ) : null}

            {canAssignRoles ? (
              <FormLayout className="users-page__roles" onSubmit={(event) => void rolesForm.handleSubmit((value) => onRolesSubmit(value.roleKeys))(event)}>
                <RoleCheckboxes
                  onRoleKeysChange={(roleKeys) => rolesForm.setValue("roleKeys", roleKeys, { shouldDirty: true })}
                  roleKeys={rolesForm.watch("roleKeys")}
                  roles={roles}
                />
                <FormActions canReset={rolesForm.formState.isDirty} isSubmitting={isRoleLoading} onReset={() => rolesForm.reset({ roleKeys: roleKeysFromUser(user) })} submitDisabled={!rolesForm.formState.isDirty} submitLabel="Salvează rolurile" submitVariant="secondary" />
              </FormLayout>
            ) : null}

            <div className="users-page__drawer-actions">
              {canUpdate ? <Button onClick={onResetPassword} variant="outline">Resetează parola</Button> : null}
              {canDisable && user.isActive ? <Button onClick={onDisable} variant="danger">Dezactivează</Button> : null}
              {canDisable && !user.isActive ? <Button isLoading={isEnableLoading} onClick={onEnable} variant="secondary">Reactivează</Button> : null}
            </div>
          </div>
        ) : null}
      </Drawer>
      {closeGuard.confirmModal}
    </>
  );
}

function RoleCheckboxes({
  onRoleKeysChange,
  roleKeys,
  roles,
}: {
  readonly onRoleKeysChange: (roleKeys: string[]) => void;
  readonly roleKeys: readonly string[];
  readonly roles: readonly RoleOption[];
}): ReactNode {
  return (
    <div className="users-page__roles">
      <strong>Roluri</strong>
      <div className="users-page__role-list">
        {roles.map((role) => (
          <Checkbox
            checked={roleKeys.includes(role.key)}
            description={role.description}
            key={role.key}
            label={role.name}
            onChange={(event) => {
              const nextValue = event.target.checked
                ? [...roleKeys, role.key].sort()
                : roleKeys.filter((roleKey) => roleKey !== role.key);
              onRoleKeysChange(nextValue);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ResetPasswordModal({
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: ResetPasswordFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: {
      confirmTemporaryPassword: "",
      temporaryPassword: "",
    },
    resolver: zodResolver(resetPasswordSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, resetPasswordFieldLabels)
    : [];
  const closeGuard = useCloseGuard(form.formState.isDirty, isSubmitting, onOpenChange);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSubmitting);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSubmitting} />
      <Modal
        description="Parola nu este afișată sau salvată în audit. Sesiunile existente vor fi invalidate."
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Resetare parolă"
      >
        <FormLayout
          className="users-page__form"
          onSubmit={(event) => void form.handleSubmit((values) => {
            form.clearErrors("root");
            onSubmit(values);
          })(event)}
        >
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <TextInput
            error={form.formState.errors.temporaryPassword?.message}
            id="temporaryPassword"
            label="Parolă temporară"
            required
            type="password"
            {...form.register("temporaryPassword")}
          />
          <TextInput
            error={form.formState.errors.confirmTemporaryPassword?.message}
            id="confirmTemporaryPassword"
            label="Confirmă parola temporară"
            required
            type="password"
            {...form.register("confirmTemporaryPassword")}
          />
          <FormActions isSubmitting={isSubmitting} submitLabel="Setează parola temporară" submitVariant="danger" />
        </FormLayout>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}
