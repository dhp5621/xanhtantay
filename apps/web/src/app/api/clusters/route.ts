import { NextResponse } from "next/server";
import { getClusters } from "@/lib/queries";

export async function GET() { return NextResponse.json(await getClusters()); }
