"use client";

import { useEffect, useState } from "react";
import type { FinancialItem } from "@/entities/financial-item";
import type { FinancialItemsResponse } from "@/features/financial-detail/schema";

type MoveDirection = "up" | "down";

type LoadState = {
	profileId: string | null;
	items: FinancialItem[];
	isLoading: boolean;
	error: string | null;
};

const parseResponseError = async (response: Response) => {
	try {
		const payload = (await response.json()) as { message?: string; error?: string };
		return payload.message ?? payload.error ?? response.statusText;
	} catch {
		return response.statusText;
	}
};

export function useFinancialItems() {
	const [state, setState] = useState<LoadState>({
		profileId: null,
		items: [],
		isLoading: true,
		error: null,
	});

	const loadItems = async () => {
		setState((current) => ({ ...current, isLoading: true, error: null }));

		try {
			const profileResponse = await fetch("/api/profile", { cache: "no-store" });
			if (!profileResponse.ok) {
				throw new Error(await parseResponseError(profileResponse));
			}

			const profilePayload = (await profileResponse.json()) as { profile: { id: string } };
			const profileId = profilePayload.profile.id;
			const itemsResponse = await fetch(`/api/financial-items?profileId=${encodeURIComponent(profileId)}`, {
				cache: "no-store",
			});

			if (!itemsResponse.ok) {
				throw new Error(await parseResponseError(itemsResponse));
			}

			const payload = (await itemsResponse.json()) as FinancialItemsResponse;
			setState({
				profileId: payload.profileId,
				items: payload.items,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "財務項目の読み込みに失敗しました",
			}));
		}
	};

	const createFinancialItem = async (parentId: string, name: string) => {
		if (!state.profileId) {
			throw new Error("プロフィールが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ profileId: state.profileId, parentId, name }),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems();
	};

	const renameFinancialItem = async (itemId: string, name: string) => {
		if (!state.profileId) {
			throw new Error("プロフィールが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ profileId: state.profileId, itemId, name }),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems();
	};

	const deleteFinancialItem = async (itemId: string) => {
		if (!state.profileId) {
			throw new Error("プロフィールが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ profileId: state.profileId, itemId }),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems();
	};

	const moveFinancialItem = async (itemId: string, direction: MoveDirection) => {
		if (!state.profileId) {
			throw new Error("プロフィールが読み込まれていません");
		}

		const target = state.items.find((item) => item.id === itemId);
		if (!target) {
			return;
		}

		const siblings = state.items
			.filter((item) => item.parentId === target.parentId)
			.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "ja"));
		const currentIndex = siblings.findIndex((item) => item.id === itemId);
		const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length) {
			return;
		}

		const nextOrderedIds = [...siblings];
		[nextOrderedIds[currentIndex], nextOrderedIds[nextIndex]] = [nextOrderedIds[nextIndex], nextOrderedIds[currentIndex]];

		const response = await fetch("/api/financial-items", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				profileId: state.profileId,
				parentId: target.parentId,
				orderedIds: nextOrderedIds.map((item) => item.id),
			}),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems();
	};

	useEffect(() => {
		void loadItems();
	}, []);

	return {
		profileId: state.profileId,
		items: state.items,
		isLoading: state.isLoading,
		error: state.error,
		refresh: loadItems,
		createFinancialItem,
		renameFinancialItem,
		deleteFinancialItem,
		moveFinancialItem,
	};
}
