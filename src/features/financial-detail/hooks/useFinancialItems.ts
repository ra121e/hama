"use client";

import { useEffect, useState } from "react";
import type { FinancialItem } from "@/entities/financial-item";
import type { FinancialItemsResponse } from "@/features/financial-detail/schema";
import { useProfileStore } from "@/store/profileStore";

type MoveDirection = "up" | "down";

type LoadState = {
	profileId: string | null;
	scenarioId: string | null;
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
	const activeScenarioId = useProfileStore((state) => state.activeScenarioId);

	const [state, setState] = useState<LoadState>({
		profileId: null,
		scenarioId: null,
		items: [],
		isLoading: true,
		error: null,
	});

	const loadItems = async (scenarioId?: string | null) => {
		const targetScenarioId = scenarioId ?? activeScenarioId;

		if (!targetScenarioId) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: "シナリオが選択されていません",
			}));
			return;
		}

		setState((current) => ({ ...current, isLoading: true, error: null }));

		try {
			const profileResponse = await fetch("/api/profile", { cache: "no-store" });
			if (!profileResponse.ok) {
				throw new Error(await parseResponseError(profileResponse));
			}

			const profilePayload = (await profileResponse.json()) as { profile: { id: string } };
			const profileId = profilePayload.profile.id;

			const itemsResponse = await fetch(
				`/api/financial-items?profileId=${encodeURIComponent(profileId)}&scenarioId=${encodeURIComponent(targetScenarioId)}`,
				{ cache: "no-store" }
			);

			if (!itemsResponse.ok) {
				throw new Error(await parseResponseError(itemsResponse));
			}

			const payload = (await itemsResponse.json()) as FinancialItemsResponse;
			setState({
				profileId: payload.profileId,
				scenarioId: payload.scenarioId,
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
		if (!state.profileId || !state.scenarioId) {
			throw new Error("プロフィールまたはシナリオが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				profileId: state.profileId,
				scenarioId: state.scenarioId,
				parentId,
				name,
			}),
		});

		if (!response.ok) {
			const errorMessage = await parseResponseError(response);
			if (response.status === 404) {
				await loadItems(state.scenarioId);
				return;
			}

			throw new Error(errorMessage);
		}

		await loadItems(state.scenarioId);
	};

	const renameFinancialItem = async (itemId: string, name: string) => {
		if (!state.profileId || !state.scenarioId) {
			throw new Error("プロフィールまたはシナリオが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				profileId: state.profileId,
				scenarioId: state.scenarioId,
				itemId,
				name,
			}),
		});

		if (!response.ok) {
			const errorMessage = await parseResponseError(response);
			if (response.status === 400) {
				await loadItems(state.scenarioId);
				return;
			}

			throw new Error(errorMessage);
		}

		await loadItems(state.scenarioId);
	};

	const deleteFinancialItem = async (itemId: string) => {
		if (!state.profileId || !state.scenarioId) {
			throw new Error("プロフィールまたはシナリオが読み込まれていません");
		}

		const response = await fetch("/api/financial-items", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				profileId: state.profileId,
				scenarioId: state.scenarioId,
				itemId,
			}),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems(state.scenarioId);
	};

	const moveFinancialItem = async (itemId: string, direction: MoveDirection) => {
		if (!state.profileId || !state.scenarioId) {
			throw new Error("プロフィールまたはシナリオが読み込まれていません");
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
				scenarioId: state.scenarioId,
				parentId: target.parentId,
				orderedIds: nextOrderedIds.map((item) => item.id),
			}),
		});

		if (!response.ok) {
			throw new Error(await parseResponseError(response));
		}

		await loadItems(state.scenarioId);
	};

	useEffect(() => {
		void loadItems(activeScenarioId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeScenarioId]);

	return {
		profileId: state.profileId,
		scenarioId: state.scenarioId,
		items: state.items,
		isLoading: state.isLoading,
		error: state.error,
		refresh: () => loadItems(state.scenarioId),
		createFinancialItem,
		renameFinancialItem,
		deleteFinancialItem,
		moveFinancialItem,
	};
}
