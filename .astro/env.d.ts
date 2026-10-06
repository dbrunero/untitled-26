declare module 'astro:env/client' {
	export const PUBLIC_GA_MEASUREMENT_ID: string | undefined;	
	export const PUBLIC_META_PIXEL_ID: string | undefined;	
}declare module 'astro:env/server' {
	export const CONTACT_TO_EMAIL: string | undefined;	
	export const CONTACT_FROM_EMAIL: string | undefined;	
	export const RESEND_API_KEY: string | undefined;	
}