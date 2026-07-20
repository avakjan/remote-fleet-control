export interface Vehicle {
  id: string;
  code: string;
  name: string;
  isOnline: boolean;
  assignedOperatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorBody {
  message?: string | string[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function getVehicles(signal?: AbortSignal): Promise<Vehicle[]> {
  return request<Vehicle[]>("/vehicles", { signal });
}

export async function setVehicleOnlineStatus(
  id: string,
  isOnline: boolean,
): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isOnline }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (Array.isArray(body.message)) {
        message = body.message.join(". ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep the status-based fallback when the API did not return JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
