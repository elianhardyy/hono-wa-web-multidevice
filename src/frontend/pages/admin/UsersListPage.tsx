import type { FC } from "hono/jsx";
import { AdminLayout, PageHeader } from "./ui.js";
import { Skeleton } from "../../components/Skeleton.js";

type LayoutBase = {
  appName: string;
  username: string;
  appDescription?: string;
  logoUrl?: string;
  avatarUrl?: string;
};

type UserRow = {
  id: string;
  username: string;
  role: "admin" | "user";
  maxDevices: number;
  createdAt: string;
};

export const UsersListPage: FC<
  LayoutBase & {
    users: UserRow[];
    alert?: string;
    isLoading?: boolean;
  }
> = (props) => (
  <AdminLayout
    appName={props.appName}
    username={props.username}
    appDescription={props.appDescription}
    logoUrl={props.logoUrl}
    avatarUrl={props.avatarUrl}
    role="admin"
    active="users"
  >
    <PageHeader
      title="Manajemen User"
      subtitle="Tambah, edit, hapus user yang bisa login dan atur limit device WhatsApp"
      actions={
        <a class="btn primary" href="/admin/users/new">
          Tambah User
        </a>
      }
    />
    {props.alert ? <div class="alert">{props.alert}</div> : null}
    <div class="grid">
      <div class="card" style="grid-column: span 12;">
        {props.isLoading ? (
          <Skeleton height={300} />
        ) : (
        <div class="tableResponsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Max Device</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {props.users.map((u) => (
                <tr>
                  <td>{u.username}</td>
                  <td class="muted">{u.role}</td>
                  <td class="muted">{String(u.maxDevices)}</td>
                  <td class="muted">{new Date(u.createdAt).toLocaleString()}</td>
                  <td>
                    <div class="btnRow">
                      <a class="btn warning" href={`/admin/users/${u.id}/edit`}>
                        <i class="fa-solid fa-pen-to-square" style="margin-right: 6px;"></i>
                        Edit
                      </a>
                      <form method="post" action={`/admin/users/${u.id}/delete`}>
                        <button class="btn danger" type="submit">
                          <i class="fa-solid fa-trash" style="margin-right: 6px;"></i>
                          Hapus
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  </AdminLayout>
);
