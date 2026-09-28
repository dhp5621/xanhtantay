import { NextResponse } from "next/server";
import { getFarms } from "@/lib/queries";

export async function GET() { return NextResponse.json(await getFarms()); }
