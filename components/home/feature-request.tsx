"use client"

import React from 'react'
import Link from "next/link"
import { SquarePen } from "lucide-react";
import { useAccess } from "@/components/providers/access-provider";

export function FeatureRequest() {
	const { hasAccess, isAuthenticated } = useAccess();

	if(!hasAccess) {
		return;
	}
  return (
	<Link href="/feature-request" className='px-6 flex flex-col gap-1.75 text-center items-center'>
		<p className="text-base font-semibold text-base-text leading-[100%]">Is there a feature you’d like to see?</p>
		<div className="flex gap-1.75 items-center">
		<p className="text-sm font-medium text-grey-c500 leading-[100%]">Write a message to the team</p>
		<SquarePen size={12} color="#727E7A" strokeWidth={1.13} />
		</div>
	</Link>
  )
}
