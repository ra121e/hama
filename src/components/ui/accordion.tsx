"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;
const AccordionItem = AccordionPrimitive.Item;
const AccordionHeader = AccordionPrimitive.Header;
const AccordionTrigger = AccordionPrimitive.Trigger;
const AccordionPanel = AccordionPrimitive.Panel;

function AccordionButton({ className, children, ...props }: React.ComponentProps<typeof AccordionTrigger>) {
	return (
		<AccordionTrigger
			className={cn(
				"flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/70 data-[open=true]:border-primary/30 data-[open=true]:bg-muted",
				className,
			)}
			{...props}
		>
			<span className="min-w-0 flex-1">{children}</span>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				className="size-4 shrink-0 transition-transform data-[open=true]:rotate-180"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</AccordionTrigger>
	);
}

export {
	Accordion,
	AccordionItem,
	AccordionHeader,
	AccordionTrigger,
	AccordionPanel,
	AccordionButton,
};
