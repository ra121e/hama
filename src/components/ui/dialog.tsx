"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

const DialogBackdrop = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Backdrop>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Backdrop
		ref={ref}
		className={cn("fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]", className)}
		{...props}
	/>
));
DialogBackdrop.displayName = "DialogBackdrop";

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Popup>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, children, ...props }, ref) => (
	<DialogPortal>
		<DialogBackdrop />
		<DialogPrimitive.Popup
			ref={ref}
			className={cn(
				"fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-background p-6 shadow-2xl outline-none data-[transition-status=closed]:scale-95 data-[transition-status=open]:scale-100 data-[transition-status=closed]:opacity-0 data-[transition-status=open]:opacity-100",
				className,
			)}
			{...props}
		>
			{children}
		</DialogPrimitive.Popup>
	</DialogPortal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

export {
	Dialog,
	DialogTrigger,
	DialogPortal,
	DialogClose,
	DialogBackdrop,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
};
