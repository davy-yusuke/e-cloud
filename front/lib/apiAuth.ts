// src/lib/apiAuth.ts
import { postAuthLogin, postAuthRegister, postAuthRefresh, postAuthLogout } from "@/client";

type AnyResp = any;

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

let accessToken: string | null = typeof window !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null;
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

function enqueueRefreshPromise(): Promise<boolean> {
    return new Promise((res) => {
        refreshQueue.push(res);
    });
}
function flushRefreshQueue(ok: boolean) {
    refreshQueue.forEach((r) => r(ok));
    refreshQueue = [];
}

function saveTokens(access: string | null, refresh: string | null | undefined) {
    accessToken = access;
    if (typeof window === "undefined") return;
    if (access === null) localStorage.removeItem(ACCESS_KEY);
    else localStorage.setItem(ACCESS_KEY, access);
    if (typeof refresh !== "undefined") {
        if (refresh === null) localStorage.removeItem(REFRESH_KEY);
        else localStorage.setItem(REFRESH_KEY, refresh);
    }
}

export function getAccessToken(): string | null {
    return accessToken ?? (typeof window !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null);
}
export function getRefreshToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
}

function normalizeResponse(resp: AnyResp) {
    // generated clients often return an object containing .data, but be permissive
    if (!resp) return { ok: false, status: 0, data: undefined };
    if (typeof resp === "object" && "data" in resp) return { ok: true, status: resp.status ?? 200, data: resp.data };
    return { ok: true, status: resp.status ?? 200, data: resp };
}

/**
 * Call the generated refresh endpoint using the stored refresh token.
 * Returns true if refresh succeeded (tokens saved), false otherwise.
 */
export async function refresh(): Promise<boolean> {
    const rawRefresh = getRefreshToken();
    if (!rawRefresh) return false;

    // avoid multiple concurrent refreshes
    if (isRefreshing) {
        return enqueueRefreshPromise();
    }
    isRefreshing = true;

    try {
        const resp = await postAuthRefresh({ body: { refresh_token: rawRefresh } }).catch((e) => e);
        const norm = normalizeResponse(resp);
        if (!norm.ok) {
            // try to analyze error
            isRefreshing = false;
            flushRefreshQueue(false);
            return false;
        }
        const data = norm.data ?? {};
        const a = (data.access_token as string) ?? (data.accessToken as string) ?? data.token ?? null;
        const r = (data.refresh_token as string) ?? (data.refreshToken as string) ?? null;
        if (!a) {
            isRefreshing = false;
            flushRefreshQueue(false);
            return false;
        }
        saveTokens(a, r ?? null);
        isRefreshing = false;
        flushRefreshQueue(true);
        return true;
    } catch (err) {
        isRefreshing = false;
        flushRefreshQueue(false);
        return false;
    }
}

/**
 * Generic wrapper around generated client functions that attach Authorization header
 * and on 401 perform a refresh then retry once.
 *
 * Usage:
 *   await callWithAuth(postFilesUpload, { body: ..., headers: { ... } })
 */
export async function callWithAuth<T = any>(fn: (opts: any) => Promise<any>, opts: any = {}): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const existingHeaders = (opts && opts.headers) ? { ...opts.headers } : {};
    const token = getAccessToken();
    if (token) {
        opts = { ...opts, headers: { ...existingHeaders, Authorization: `Bearer ${token}` } };
    }

    // attempt
    try {
        const resp = await fn(opts);
        const norm = normalizeResponse(resp);
        if (!norm.ok) {
            // treat non-ok as error
            return { ok: false, status: norm.status, error: JSON.stringify(norm.data) };
        }
        return { ok: true, status: norm.status, data: norm.data };
    } catch (err: any) {
        // try to detect 401
        const status = err?.status ?? err?.response?.status ?? err?.statusCode ?? 0;
        if (status === 401 || (typeof err === "object" && /401/.test(String(err?.message ?? "")))) {
            // try refresh
            const refreshed = await refresh();
            if (!refreshed) {
                saveTokens(null, null);
                return { ok: false, status: 401, error: "unauthorized" };
            }
            // retry once
            const newToken = getAccessToken();
            if (newToken) {
                opts = { ...opts, headers: { ...existingHeaders, Authorization: `Bearer ${newToken}` } };
            } else {
                return { ok: false, status: 401, error: "unauthorized" };
            }
            try {
                const resp2 = await fn(opts);
                const norm2 = normalizeResponse(resp2);
                if (!norm2.ok) return { ok: false, status: norm2.status, error: JSON.stringify(norm2.data) };
                return { ok: true, status: norm2.status, data: norm2.data };
            } catch (err2: any) {
                return { ok: false, status: err2?.status ?? 0, error: String(err2?.message ?? err2) };
            }
        }
        return { ok: false, status: status ?? 0, error: String(err?.message ?? err) };
    }
}

/* --- high level auth helpers --- */

export async function login(email: string, password: string) {
    try {
        const resp = await postAuthLogin({ body: { email, password } }).catch((e) => e);
        const norm = normalizeResponse(resp);
        if (!norm.ok) return { ok: false, status: norm.status, error: String(norm.data) };
        const data = norm.data ?? {};
        const a = (data.access_token as string) ?? (data.accessToken as string) ?? data.token ?? null;
        const r = (data.refresh_token as string) ?? (data.refreshToken as string) ?? null;
        if (!a) return { ok: false, status: 0, error: "no access token in response" };
        saveTokens(a, r ?? null);
        return { ok: true, status: norm.status, data };
    } catch (err: any) {
        return { ok: false, status: err?.status ?? 0, error: String(err?.message ?? err) };
    }
}

export async function register(email: string, password: string, name?: string) {
    try {
        if (!name) name = email.split("@")[0];
        const resp = await postAuthRegister({ body: { email, password, name } }).catch((e) => e);
        const norm = normalizeResponse(resp);
        if (!norm.ok) return { ok: false, status: norm.status, error: String(norm.data) };

        const auto = await login(email, password);
        return { ok: true, status: norm.status, data: norm.data, autoLogin: auto };
    } catch (err: any) {
        return { ok: false, status: err?.status ?? 0, error: String(err?.message ?? err) };
    }
}


export async function logout() {
    try {
        const rawRefresh = getRefreshToken();
        if (rawRefresh) {
            await postAuthLogout({ body: { refresh_token: rawRefresh } }).catch(() => { });
        }
    } finally {
        saveTokens(null, null);
    }
}
