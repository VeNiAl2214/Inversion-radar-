# Radar de inversión (versión real)

App PWA que analiza acciones, CEDEARs y bonos (técnico + fundamental + noticias con IA) y te avisa por mail cuándo vender.

## Puesta en marcha (15 minutos)
1. **Claves** (todas tienen plan gratis o de bajo costo):
   - Anthropic: https://console.anthropic.com → API keys
   - Finnhub: https://finnhub.io → API key (fundamentales y noticias)
   - Resend: https://resend.com → API key (mails). Con el remitente de prueba solo podés enviarte mails a la dirección con la que te registraste.
2. **Subí esta carpeta a un repositorio de GitHub.**
3. **Netlify** → Add new site → Import from Git → elegí el repo (no hace falta configurar nada más).
4. En *Site configuration → Environment variables* cargá las variables de `.env.example`. `APP_KEY` es la clave que inventes para entrar a tu app.
5. Redeploy, abrí la URL, ingresá tu `APP_KEY` y en el celular elegí *Agregar a pantalla de inicio*.

## Cómo funciona
- `analyze`: baja precios (Yahoo Finance), calcula RSI, MACD, medias y ATR, trae fundamentales y noticias (Finnhub) y le pide a Claude el análisis. Puntaje = 40 % técnico + 35 % fundamental + 25 % noticias. Resultados en caché por 10 minutos.
- `positions`: guarda tus compras y tu diario en Netlify Blobs.
- `watch`: corre cada 30 minutos, compara el precio con tu objetivo, tu stop y tu fecha de venta, y manda el mail una sola vez.

## Notas
- Yahoo Finance no tiene API oficial: para un uso serio, cambiá `yahoo()` en `netlify/lib/data.mjs` por Twelve Data, Polygon o Alpaca.
- Para bonos usá ETFs (TLT, IEF, SHY, LQD) o rendimientos (^TNX). Para CEDEARs, ingresá el ticker de la acción original.
- Es de uso personal: una sola cartera protegida por `APP_KEY`. Para varios usuarios hay que agregar login.
