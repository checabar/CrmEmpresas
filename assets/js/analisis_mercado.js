// ============================================
// ANÁLISIS DE MERCADO - INVESTIGACIÓN WEB + IA
// Flujo: Búsqueda Web → research → OpenAI → markdown
// 
// OPCIONES DE BÚSQUEDA (en orden de prioridad):
// 1. Serper.dev directo (si tenés key Y no hay CORS)
// 2. Proxy Cloudflare Worker (si configurás PROXY_URL)
// 3. OpenAI Responses API con web_search tool (solo necesita OpenAI key)
// ============================================

const CHECA_PRODUCTOS = `
CHECA - Cerveza Artesanal "Puro Estilo"
PORTFOLIO (10 VARIEDADES):
1. RYLE - GOLDEN
2. PRAHA - LAGER RUBIA
3. MESOPOTAMIA - AMERICAN WHEAT
4. KING BEE - HONEY
5. SILESIA - LAGER ROJA
6. GOOD DEVIL - SCOTTISH
7. HELLFISH - RED IPA
8. HODGSON - IPA
9. MORAVIA - LAGER NEGRA
10. COTTON FIELD - STOUT
Ubicación: Sacanta, Córdoba, Argentina
Web: https://checacerveza.com.ar | Instagram: @checapuroestilo
`;

// URL del Cloudflare Worker proxy (opcional - si lo desplegás)
// Dejá vacío si no lo usás
var PROXY_SEARCH_URL = (typeof PROXY_SEARCH_URL !== 'undefined') ? PROXY_SEARCH_URL : '';

// ============================================
// HELPERS
// ============================================

function getOpenAIKey() {
    return (typeof OPENAI_API_KEY !== 'undefined' && OPENAI_API_KEY) ? OPENAI_API_KEY : '';
}

function getSerperKey() {
    return (typeof SERPER_API_KEY !== 'undefined' && SERPER_API_KEY) ? SERPER_API_KEY : '';
}

function updateLoadingMsg(msg) {
    const el = document.getElementById('loadingAnalisisMsg');
    if (el) el.textContent = msg;
}

// ============================================
// BÚSQUEDA WEB - ESTRATEGIA AUTOMÁTICA
// Intenta Serper → Proxy → OpenAI web_search
// ============================================

async function buscarInfoDistribuidor(dist) {
    const nombre = dist.nombre || '';
    const ciudad = dist.ciudad || '';
    const provincia = dist.provincia || '';
    const categoria = dist.categoria || '';

    const queryPrincipal = `${nombre} ${ciudad} ${provincia} ${categoria}`.trim();

    // Intentar Serper.dev directo
    const serperKey = getSerperKey();
    if (serperKey) {
        console.log('🔍 Intentando Serper.dev directo...');
        updateLoadingMsg('Buscando con Serper.dev...');
        const resultado = await buscarConSerper(dist, serperKey);
        if (resultado) return resultado;
        console.warn('⚠️ Serper falló (posible CORS), intentando alternativas...');
    }

    // Intentar Proxy Cloudflare Worker
    if (PROXY_SEARCH_URL) {
        console.log('🔍 Intentando proxy Cloudflare Worker...');
        updateLoadingMsg('Buscando vía proxy...');
        const resultado = await buscarConProxy(dist);
        if (resultado) return resultado;
        console.warn('⚠️ Proxy falló, intentando OpenAI web_search...');
    }

    // Fallback: OpenAI Responses API con web_search tool
    const openaiKey = getOpenAIKey();
    if (openaiKey) {
        console.log('🔍 Usando OpenAI Responses API con web_search...');
        updateLoadingMsg('Buscando con OpenAI web search...');
        const resultado = await buscarConOpenAIWebSearch(dist, openaiKey);
        if (resultado) return resultado;
    }

    console.warn('⚠️ Ningún método de búsqueda disponible');
    return null;
}

// ============================================
// OPCIÓN 1: SERPER.DEV DIRECTO
// ============================================

async function buscarConSerper(dist, serperKey) {
    const nombre = dist.nombre || '';
    const ciudad = dist.ciudad || '';
    const provincia = dist.provincia || '';

    const queries = [
        `"${nombre}" ${ciudad} ${provincia}`,
        `${nombre} ${ciudad} distribuidor bebidas cerveza`,
    ];

    let allResults = [];

    for (const query of queries) {
        try {
            console.log(`🔍 Serper: "${query}"`);

            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'X-API-KEY': serperKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: query, gl: 'ar', hl: 'es', num: 10 })
            });

            if (!response.ok) continue;
            const data = await response.json();

            if (data.organic) {
                for (const r of data.organic) {
                    allResults.push({ title: r.title || '', link: r.link || '', text: r.snippet || '', source: 'serper_organic' });
                }
            }
            if (data.knowledgeGraph) {
                const kg = data.knowledgeGraph;
                allResults.push({
                    title: kg.title || 'Knowledge Graph',
                    link: kg.website || '',
                    text: [kg.description, kg.type, kg.address, kg.phone].filter(Boolean).join(' | '),
                    source: 'serper_kg'
                });
                if (kg.attributes) {
                    for (const [key, val] of Object.entries(kg.attributes)) {
                        allResults.push({ title: `KG: ${key}`, link: '', text: String(val), source: 'serper_kg' });
                    }
                }
            }
            if (data.places) {
                for (const place of data.places) {
                    allResults.push({
                        title: place.title || place.name || '',
                        link: place.link || '',
                        text: [place.address, place.phone, place.rating ? `Rating: ${place.rating}` : null, place.reviews ? `Reviews: ${place.reviews}` : null].filter(Boolean).join(' | '),
                        source: 'serper_places'
                    });
                }
            }

            await new Promise(r => setTimeout(r, 300));
        } catch (err) {
            console.warn(`⚠️ Serper error: ${err.message}`);
            // Si es CORS, salimos del loop
            if (err.message.includes('CORS') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                return null;
            }
        }
    }

    if (allResults.length === 0) return null;

    return formatResearch(queries[0], queries, deduplicar(allResults));
}

// ============================================
// OPCIÓN 2: PROXY CLOUDFLARE WORKER
// ============================================

async function buscarConProxy(dist) {
    const nombre = dist.nombre || '';
    const ciudad = dist.ciudad || '';
    const provincia = dist.provincia || '';
    const categoria = dist.categoria || '';

    const queries = [
        `"${nombre}" ${ciudad} ${provincia}`,
        `${nombre} ${ciudad} distribuidor bebidas cerveza`,
    ];

    let allResults = [];

    for (const query of queries) {
        try {
            const response = await fetch(PROXY_SEARCH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, country: 'ar', lang: 'es' })
            });

            if (!response.ok) continue;
            const data = await response.json();

            if (data.results) {
                for (const r of data.results) {
                    allResults.push({
                        title: r.title || '',
                        link: r.link || r.url || '',
                        text: r.text || r.snippet || r.description || '',
                        source: 'proxy'
                    });
                }
            }

            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.warn(`⚠️ Proxy error: ${err.message}`);
        }
    }

    if (allResults.length === 0) return null;
    return formatResearch(queries[0], queries, deduplicar(allResults));
}

// ============================================
// OPCIÓN 3: OPENAI RESPONSES API + WEB_SEARCH
// (No necesita Serper key, solo OpenAI key)
// ============================================

async function buscarConOpenAIWebSearch(dist, openaiKey) {
    const nombre = dist.nombre || '';
    const ciudad = dist.ciudad || '';
    const provincia = dist.provincia || '';
    const categoria = dist.categoria || '';

    const queryTexto = `${nombre} ${ciudad} ${provincia} ${categoria}`.trim();

    try {
        // Usar la Responses API de OpenAI con el tool web_search
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                tools: [{ type: 'web_search_preview' }],
                input: `Buscá información pública sobre el siguiente distribuidor de bebidas/cerveza en Argentina. 
Necesito datos verificables: qué vende, dónde está, teléfono, email, web, redes sociales, reseñas, competencia.
NO inventes datos. Solo reportá lo que encuentres.

Distribuidor: ${nombre}
Ciudad: ${ciudad}
Provincia: ${provincia}  
Categoría: ${categoria}

Respondé con un listado estructurado de TODOS los datos que encontraste, indicando la fuente/URL de cada dato.
Si hay resultados de Google Maps, incluí rating, cantidad de reseñas, dirección y teléfono.
Si encontrás redes sociales (Instagram, Facebook), incluí el link.
Si no encontrás nada útil, decilo claramente.`,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.warn(`⚠️ OpenAI Responses API error (${response.status}): ${errText.substring(0, 200)}`);

            // Si la Responses API no está disponible, intentar con Chat Completions + instrucción de búsqueda
            return await buscarConOpenAIChatFallback(dist, openaiKey);
        }

        const data = await response.json();

        // Extraer el texto de la respuesta y las URLs citadas
        let textoCompleto = '';
        let urlsCitadas = [];

        // La Responses API devuelve output como array
        if (data.output) {
            for (const item of data.output) {
                if (item.type === 'message') {
                    for (const block of (item.content || [])) {
                        if (block.type === 'output_text') {
                            textoCompleto += block.text + '\n';
                            // Extraer annotations/URLs
                            if (block.annotations) {
                                for (const ann of block.annotations) {
                                    if (ann.url) urlsCitadas.push(ann.url);
                                }
                            }
                        }
                    }
                }
                // web_search_call results
                if (item.type === 'web_search_call') {
                    console.log('🌐 OpenAI realizó búsqueda web:', item.id);
                }
            }
        }

        if (!textoCompleto.trim()) {
            console.warn('⚠️ OpenAI web_search no devolvió texto');
            return null;
        }

        // Parsear el texto en resultados estructurados
        const results = [];

        // El resultado principal de la IA con búsqueda
        results.push({
            title: `Investigación web: ${nombre}`,
            link: '',
            text: textoCompleto.trim(),
            source: 'openai_web_search'
        });

        // Agregar URLs encontradas como resultados individuales
        const urlsUnicas = [...new Set(urlsCitadas)];
        for (const url of urlsUnicas) {
            results.push({
                title: `Fuente citada`,
                link: url,
                text: '',
                source: 'openai_citation'
            });
        }

        console.log(`✅ OpenAI web_search: ${results.length} resultados, ${urlsUnicas.length} URLs citadas`);

        return formatResearch(queryTexto, [queryTexto], results);

    } catch (err) {
        console.warn(`⚠️ OpenAI web_search error: ${err.message}`);
        return null;
    }
}

// Fallback: si la Responses API no está disponible, usar Chat Completions
// (sin búsqueda real, pero con el conocimiento de GPT)
async function buscarConOpenAIChatFallback(dist, openaiKey) {
    console.log('🔄 Fallback: usando Chat Completions (sin búsqueda web real)...');
    updateLoadingMsg('Consultando base de conocimiento de OpenAI...');

    const nombre = dist.nombre || '';
    const ciudad = dist.ciudad || '';
    const provincia = dist.provincia || '';
    const categoria = dist.categoria || '';
    const queryTexto = `${nombre} ${ciudad} ${provincia} ${categoria}`.trim();

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Sos un investigador de mercado. Te dan el nombre de un distribuidor de bebidas en Argentina.
Respondé SOLO con información que conozcas. NO inventes datos.
Si no conocés al distribuidor, decilo claramente.
Formato: listado de datos encontrados con nivel de confianza (alto/medio/bajo).`
                    },
                    {
                        role: 'user',
                        content: `¿Qué sabés sobre este distribuidor?
Nombre: ${nombre}
Ciudad: ${ciudad}, ${provincia}
Categoría: ${categoria}
Link Google Maps: ${dist.link_google || 'No disponible'}

Listá todo lo que sepas: tipo de negocio, productos, contacto, tamaño, reputación.`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        const texto = data.choices[0].message.content;

        if (!texto) return null;

        return formatResearch(queryTexto, [queryTexto], [{
            title: `Conocimiento OpenAI: ${nombre}`,
            link: '',
            text: texto,
            source: 'openai_knowledge'
        }]);

    } catch (err) {
        console.warn(`⚠️ Chat fallback error: ${err.message}`);
        return null;
    }
}

// ============================================
// UTILIDADES DE RESEARCH
// ============================================

function deduplicar(results) {
    const seen = new Set();
    return results.filter(r => {
        if (!r.link) return true;
        if (seen.has(r.link)) return false;
        seen.add(r.link);
        return true;
    });
}

function formatResearch(query, queries, results) {
    return {
        query: query,
        queries_used: queries,
        fetched_at: new Date().toISOString(),
        result_count: results.length,
        results: results
    };
}

// ============================================
// PASO 2: GENERAR ANÁLISIS CON IA + RESEARCH
// ============================================

async function generarAnalisisConResearch(dist, research) {
    const openaiKey = getOpenAIKey();
    if (!openaiKey) throw new Error('Falta API Key de OpenAI');

    updateLoadingMsg('Generando análisis profundo con IA...');

    // Preparar el contexto de research para el prompt
    let researchContext = '';
    if (research && research.results && research.results.length > 0) {
        researchContext = research.results.map((r, i) => {
            let entry = `[${i + 1}] ${r.title}`;
            if (r.link) entry += `\n    URL: ${r.link}`;
            if (r.text) entry += `\n    ${r.text}`;
            if (r.source) entry += `\n    (fuente: ${r.source})`;
            return entry;
        }).join('\n\n');
    }

    const systemPrompt = `Rol: Sos un analista de mercado especializado en distribución de bebidas y cerveza en Argentina.
Objetivo: Construir un diagnóstico profundo del distribuidor basado SOLO en la información encontrada en la investigación web que te paso abajo.

REGLAS ESTRICTAS:
1. NO inventes información. Si algo NO está respaldado por los resultados de búsqueda, indicá "No verificado".
2. Separá claramente "Hechos verificables" de "Interpretaciones" en cada sección.
3. Agregá "Fuentes:" con los links relevantes al final de cada sección donde uses datos.
4. NO hagas estrategia comercial, ni sugerencias de venta, ni recomendaciones de productos.
5. Si la búsqueda no trajo resultados útiles, decilo honestamente.

FORMATO DE SALIDA (Markdown):

## A) Resumen del Distribuidor
Breve perfil: tamaño estimado, tipo, antigüedad, nivel de profesionalización.

## B) Información Verificable
**Hechos:**
(solo datos confirmados por fuentes)
**Interpretaciones:**
(inferencias razonables basadas en los hechos)
**Fuentes:** [links]

## C) Presencia Digital y Reputación
**Hechos:**
(web, redes sociales, reseñas Google, rating)
**Interpretaciones:**
**Fuentes:** [links]

## D) Portafolio y Posicionamiento
**Hechos:**
(marcas que distribuye, tipo de productos, segmento)
**Interpretaciones:**
**Fuentes:** [links]

## E) Tipo de Cliente del Distribuidor
**Hechos:**
(a quién le vende: bares, restaurantes, vinotecas, kioscos, etc.)
**Interpretaciones:**
**Fuentes:** [links]

## F) Fortalezas Observables
(solo basadas en evidencia encontrada)

## G) Debilidades / Riesgos Observables
(solo basadas en evidencia encontrada)

## H) Información Faltante Clave
- Qué datos faltan para evaluarlo mejor
- Qué habría que validar en una reunión o llamada`;

    const userPrompt = `DATOS DEL DISTRIBUIDOR EN EL CRM:
- Nombre: ${dist.nombre}
- Ubicación: ${dist.ciudad}, ${dist.provincia}
- Categoría: ${dist.categoria || 'No especificada'}
- Puntaje CRM: ${dist.puntaje || 'N/A'}/10
- Contacto: ${dist.nombre_contacto || 'Desconocido'}
- Teléfono: ${dist.telefono || dist.telefono_contacto || 'No disponible'}
- Email: ${dist.email || dist.email_contacto || 'No disponible'}
- Link Google: ${dist.link_google || 'No disponible'}

═══════════════════════════════════════════
RESULTADOS DE INVESTIGACIÓN WEB (${research ? research.result_count : 0} resultados):
═══════════════════════════════════════════
${researchContext || 'No se realizó búsqueda web. Analizá solo con los datos del CRM y tu conocimiento general. Marcá todo como "No verificado por fuentes web".'}

═══════════════════════════════════════════
Generá el diagnóstico completo en formato Markdown siguiendo estrictamente el formato indicado.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.4,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`OpenAI error ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ============================================
// FLUJO PRINCIPAL: ANÁLISIS PROFUNDO
// ============================================

async function analizarDistribuidorProfundo() {
    if (!currentDistributor) { alert('No hay distribuidor seleccionado'); return; }

    const dist = currentDistributor;
    const btnAnalizar = document.getElementById('btnAnalyzarMercado');
    const btnRefresh = document.getElementById('btnRefreshResearch');
    const loading = document.getElementById('loadingAnalisis');
    const resultados = document.getElementById('resultadosAnalisis');

    // Validar que al menos tenga OpenAI key
    const openaiKey = getOpenAIKey();
    if (!openaiKey) {
        alert('⚠️ Necesitás configurar la API Key de OpenAI para generar el análisis.\n\nPegala en el campo "OpenAI API Key" o en el archivo api_config.js');
        return;
    }

    // UI: loading
    if (btnAnalizar) btnAnalizar.disabled = true;
    if (btnRefresh) btnRefresh.disabled = true;
    if (loading) loading.style.display = 'block';
    if (resultados) resultados.style.display = 'none';

    try {
        console.log('🔍 Iniciando análisis profundo para:', dist.nombre);

        // PASO 1: Buscar información pública
        updateLoadingMsg('Buscando información pública en internet...');
        let research = await buscarInfoDistribuidor(dist);

        if (research) {
            dist.research = research;
            markAsDirty();
            console.log(`✅ Research guardado: ${research.result_count} resultados`);
        } else {
            console.warn('⚠️ Sin resultados de búsqueda - análisis con datos del CRM solamente');
            updateLoadingMsg('Sin resultados web - analizando con datos del CRM...');
        }

        // PASO 2: Generar análisis con IA
        updateLoadingMsg('Generando diagnóstico con IA (puede tardar ~30s)...');
        const markdown = await generarAnalisisConResearch(dist, research);

        // PASO 3: Guardar en el distribuidor y en Firestore
        dist.analisis = {
            generated_at: new Date().toISOString(),
            had_research: !!(research && research.result_count > 0),
            research_count: research ? research.result_count : 0,
            search_method: research ? (research.results[0]?.source || 'unknown') : 'none',
            markdown: markdown
        };

        const updateData = { analisis: dist.analisis };
        if (research) updateData.research = research;

        await db.collection('distribuidores').doc(dist.id).update(updateData);

        // PASO 4: Mostrar
        mostrarAnalisisMarkdown(dist, false);
        if (btnAnalizar) btnAnalizar.innerHTML = '🔄 Regenerar Análisis';
        console.log('✅ Análisis profundo completado y guardado');

    } catch (error) {
        console.error('❌ Error en análisis profundo:', error);
        alert('Error: ' + error.message);
    } finally {
        if (btnAnalizar) btnAnalizar.disabled = false;
        if (btnRefresh) btnRefresh.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

// ============================================
// SOLO ACTUALIZAR BÚSQUEDA (sin regenerar análisis)
// ============================================

async function actualizarResearch() {
    if (!currentDistributor) { alert('No hay distribuidor seleccionado'); return; }

    const openaiKey = getOpenAIKey();
    const serperKey = getSerperKey();

    if (!serperKey && !PROXY_SEARCH_URL && !openaiKey) {
        alert('⚠️ No hay método de búsqueda configurado.\n\nOpciones:\n1. Configurá Serper key (gratis en serper.dev)\n2. Configurá OpenAI key (usa web_search automáticamente)\n3. Configurá un proxy URL');
        return;
    }

    const dist = currentDistributor;
    const btnRefresh = document.getElementById('btnRefreshResearch');
    const loading = document.getElementById('loadingAnalisis');

    if (btnRefresh) btnRefresh.disabled = true;
    if (loading) loading.style.display = 'block';

    try {
        updateLoadingMsg('Actualizando búsqueda web...');
        const research = await buscarInfoDistribuidor(dist);

        if (research) {
            dist.research = research;
            await db.collection(CURRENT_COLLECTION).doc(dist.id).update({ research: research });
            const metodo = research.results[0]?.source || 'desconocido';
            alert(`✅ Búsqueda actualizada:\n• ${research.result_count} resultados encontrados\n• Método: ${metodo}\n\nAhora podés regenerar el análisis con la nueva información.`);
            mostrarResearchBadge(dist);
        } else {
            alert('❌ No se encontraron resultados. Verificá tu conexión o configuración de API keys.');
        }

    } catch (error) {
        console.error('❌ Error actualizando research:', error);
        alert('Error en búsqueda: ' + error.message);
    } finally {
        if (btnRefresh) btnRefresh.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

// ============================================
// MOSTRAR BADGE DE RESEARCH
// ============================================

function mostrarResearchBadge(dist) {
    const badge = document.getElementById('researchBadge');
    if (!badge) return;

    if (dist.research && dist.research.result_count > 0) {
        const fecha = new Date(dist.research.fetched_at).toLocaleDateString('es-AR');
        const metodo = dist.research.results[0]?.source || '';
        const metodoLabel = {
            'serper_organic': '🟢 Serper',
            'serper_kg': '🟢 Serper',
            'serper_places': '🟢 Serper',
            'proxy': '🔵 Proxy',
            'openai_web_search': '🟣 OpenAI Web Search',
            'openai_citation': '🟣 OpenAI',
            'openai_knowledge': '🟠 OpenAI (sin búsqueda)'
        }[metodo] || '🔍';
        badge.innerHTML = `${metodoLabel} ${dist.research.result_count} resultados (${fecha})`;
        badge.style.color = '#10b981';
    } else {
        badge.innerHTML = '⚪ Sin búsqueda web realizada';
        badge.style.color = '#94a3b8';
    }
}

// ============================================
// MARKDOWN → HTML (parser simple)
// ============================================

function markdownToHtml(md) {
    if (!md) return '';
    let html = md
        .replace(/^### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^## (.+)$/gm, '<h4 class="md-h2">$1</h4>')
        .replace(/^# (.+)$/gm, '<h3 class="md-h1">$1</h3>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#667eea;">$1</a>')
        .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
        .replace(/^[═━─]{3,}$/gm, '<hr style="border:none; border-top:1px solid #e2e8f0; margin:1rem 0;">')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    html = html.replace(/((?:<li>.*?<\/li>\s*(?:<br>)?)+)/g, '<ul>$1</ul>');
    html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, inner) => '<ul>' + inner.replace(/<br>/g, '') + '</ul>');

    return '<p>' + html + '</p>';
}

// ============================================
// MOSTRAR ANÁLISIS (MARKDOWN RENDERIZADO)
// ============================================

function mostrarAnalisisMarkdown(dist, esGuardado) {
    const container = document.getElementById('resultadosAnalisis');
    if (!container) return;

    let html = '';

    // Badge de research inline
    html += `<div style="font-size:0.8rem; margin-bottom:0.8rem; padding:0.5rem 0.8rem; background:rgba(100,116,139,0.08); border-radius:0.4rem;">`;
    if (dist.research && dist.research.result_count > 0) {
        const fecha = new Date(dist.research.fetched_at).toLocaleDateString('es-AR');
        const metodo = dist.analisis?.search_method || dist.research.results[0]?.source || '';
        const metodoLabel = {
            'serper_organic': 'Serper.dev',
            'proxy': 'Proxy',
            'openai_web_search': 'OpenAI Web Search',
            'openai_citation': 'OpenAI Web Search',
            'openai_knowledge': 'OpenAI (base de conocimiento)'
        }[metodo] || 'Búsqueda web';
        html += `🌐 <strong>${dist.research.result_count}</strong> resultados vía ${metodoLabel} (${fecha})`;
    } else {
        html += `⚪ Análisis sin búsqueda web — configurá una API key para resultados más profundos`;
    }
    html += `</div>`;

    // Estado del análisis
    if (dist.analisis) {
        const fecha = new Date(dist.analisis.generated_at).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const tipo = dist.analisis.had_research ? '🔬 Análisis Profundo' : '📝 Análisis Básico';

        if (esGuardado) {
            html += `<div style="background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:0.5rem; padding:0.8rem; margin-bottom:1rem; color:#047857; font-size:0.85rem;">
                ✅ <strong>${tipo}</strong> — generado ${fecha}
            </div>`;
        }

        html += `<div class="analisis-markdown">${markdownToHtml(dist.analisis.markdown)}</div>`;
    } else {
        html += `<div style="padding:2rem; text-align:center; color:#94a3b8;">
            <p>No hay análisis generado todavía.</p>
            <p style="font-size:0.85rem;">Presioná "Generar Análisis Profundo" para comenzar.</p>
        </div>`;
    }

    container.innerHTML = html;
    container.style.display = 'block';

    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// ============================================
// CARGAR ANÁLISIS AL ABRIR DRAWER
// ============================================

function cargarAnalisisGuardado() {
    if (!currentDistributor) return;

    const resultados = document.getElementById('resultadosAnalisis');
    const btnAnalizar = document.getElementById('btnAnalyzarMercado');

    mostrarResearchBadge(currentDistributor);

    // Mostrar análisis guardado
    if (currentDistributor.analisis && currentDistributor.analisis.markdown) {
        mostrarAnalisisMarkdown(currentDistributor, true);
        if (btnAnalizar) btnAnalizar.innerHTML = '🔄 Regenerar Análisis';
    } else if (currentDistributor.analisis_mercado) {
        // Legacy: formato JSON viejo
        mostrarAnalisisLegacy(currentDistributor.analisis_mercado);
        if (btnAnalizar) btnAnalizar.innerHTML = '🔄 Regenerar Análisis (nuevo formato)';
    } else {
        if (resultados) resultados.style.display = 'none';
        if (btnAnalizar) btnAnalizar.innerHTML = '🔍 Generar Análisis Profundo';
    }
}

// Mostrar análisis legacy
function mostrarAnalisisLegacy(analisis) {
    const container = document.getElementById('resultadosAnalisis');
    if (!container) return;

    let html = `<div style="background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:0.5rem; padding:0.8rem; margin-bottom:1rem; color:#b45309; font-size:0.85rem;">
        ⚠️ <strong>Formato anterior</strong> — regenerá para obtener análisis profundo con búsqueda web
    </div>`;

    const res = analisis.resumen || analisis.informacion_general || {};
    html += `<div class="analisis-section"><h4>📊 Resumen</h4>`;
    html += `<p><strong>Tamaño:</strong> ${res.tamano_estimado || res.tamaño || 'No verificado'}</p>`;
    html += `<p><strong>Tipo:</strong> ${res.tipo_distribuidor || res.tipo_negocio || 'No verificado'}</p>`;
    html += `</div>`;

    if (analisis.fortalezas) {
        html += `<div class="analisis-section"><h4>💪 Fortalezas</h4><ul>`;
        html += analisis.fortalezas.map(f => `<li>${f}</li>`).join('');
        html += `</ul></div>`;
    }

    container.innerHTML = html;
    container.style.display = 'block';
}

// Extender openDrawer para cargar análisis guardado
const _originalOpenDrawer = window.openDrawer;
if (typeof _originalOpenDrawer === 'function') {
    window.openDrawer = function (id) {
        _originalOpenDrawer(id);
        setTimeout(() => { cargarAnalisisGuardado(); }, 150);
    };
}

// ============================================
// ESTRATEGIA COMERCIAL
// ============================================

async function generarEstrategia() {
    if (!currentDistributor) { alert('No hay distribuidor seleccionado'); return; }

    const dist = currentDistributor;
    const btnEstrategia = document.getElementById('btnGenerarEstrategia');
    const loading = document.getElementById('loadingEstrategia');
    const output = document.getElementById('outputAsistente');

    if (!dist.analisis && !dist.analisis_mercado) {
        alert('Primero debés generar el Análisis de Mercado del distribuidor.');
        return;
    }

    if (btnEstrategia) btnEstrategia.disabled = true;
    if (loading) loading.style.display = 'block';
    if (output) output.value = '';

    try {
        const openaiKey = getOpenAIKey();
        let estrategiaTexto;

        if (openaiKey) {
            estrategiaTexto = await generarEstrategiaConIA(dist, openaiKey);
        } else {
            estrategiaTexto = generarEstrategiaOffline(dist);
        }

        if (output) output.value = estrategiaTexto;
        console.log('✅ Estrategia generada');

    } catch (error) {
        console.error('❌ Error generando estrategia:', error);
        alert('Error al generar estrategia: ' + error.message);
    } finally {
        if (btnEstrategia) btnEstrategia.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

async function generarEstrategiaConIA(dist, apiKey) {
    const analisisTexto = dist.analisis ? dist.analisis.markdown : JSON.stringify(dist.analisis_mercado, null, 2);
    const historial = dist.historial_contactos || [];
    const ultimosLogs = historial.slice(0, 10);

    const systemPrompt = `Rol: Sos un gerente comercial senior de Checa, marca de cerveza artesanal argentina.

${CHECA_PRODUCTOS}

Tu trabajo: diseñar estrategia comercial para desarrollar este distribuidor, basándote en el análisis previo y los logs comerciales.

Reglas:
1. Basate SIEMPRE en información existente (análisis + logs).
2. Si hay info nueva en los logs, actualizá la estrategia.
3. Sé concreto, no genérico.

Formato:

A) SITUACIÓN ACTUAL
- Estado relación (prospecto/negociación/prueba/activo/riesgo)
- Nivel interés estimado (0–100)
- Oportunidades detectadas

B) ESTRATEGIA RECOMENDADA
- Objetivo comercial
- Productos prioritarios (de las 10 variedades Checa)
- Argumentos comerciales principales
- Riesgos a evitar

C) PRÓXIMA ACCIÓN
- Qué hacer en el próximo contacto
- Qué NO hacer todavía

D) AJUSTES RESPECTO A ESTRATEGIA ANTERIOR
- Qué cambió según nuevos datos/logs

E) SEÑALES A OBSERVAR
- Indicadores de avance o fracaso`;

    const userPrompt = `ANÁLISIS DEL DISTRIBUIDOR:
${analisisTexto}

ESTADO EN CRM:
- Etapa: ${dist.etapa_pipeline || 'nuevo'}
- Estado: ${dist.estado || 'pendiente'}
- Probabilidad: ${dist.probabilidad || 0}%
- Responsable: ${dist.responsable_comercial || 'Sin asignar'}

NOTAS: ${dist.notas_comerciales || 'Sin notas'}

HISTORIAL (últimos ${ultimosLogs.length}):
${ultimosLogs.length > 0
            ? ultimosLogs.map(log => `- [${log.fecha ? new Date(log.fecha).toLocaleDateString('es-AR') : '?'}] ${log.tipo}: ${log.resultado} ${log.notas ? '| ' + log.notas : ''}`).join('\n')
            : 'Sin interacciones registradas'}

PRÓXIMA ACCIÓN: ${dist.proxima_accion || 'No definida'}

Generá la estrategia comercial.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 2500
        })
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

function generarEstrategiaOffline(dist) {
    const historial = dist.historial_contactos || [];
    return `🎯 ESTRATEGIA COMERCIAL - ${dist.nombre}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A) SITUACIÓN: Prospecto | Interacciones: ${historial.length}

B) PRODUCTOS SUGERIDOS: PRAHA, RYLE, HODGSON, MESOPOTAMIA
   Argumentos: 10 variedades, marca cordobesa, margen competitivo

C) PRÓXIMA ACCIÓN: ${historial.length === 0 ? 'Primer contacto telefónico' : 'Seguimiento'}

D) AJUSTES: Modo offline - activá IA para estrategia adaptativa

E) SEÑALES: ✅ Pide precios → avanza | ⚠️ No responde → reintentar`;
}

// ============================================
// BOTÓN COPIAR OUTPUT
// ============================================

function setupCopyButton() {
    const btn = document.getElementById('btnCopyOutput');
    if (btn) {
        btn.addEventListener('click', () => {
            const output = document.getElementById('outputAsistente');
            if (output && output.value) {
                navigator.clipboard.writeText(output.value).then(() => {
                    btn.textContent = '✅ Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                }).catch(() => {
                    output.select();
                    document.execCommand('copy');
                    btn.textContent = '✅ Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                });
            }
        });
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const btnAnalizar = document.getElementById('btnAnalyzarMercado');
    if (btnAnalizar) btnAnalizar.addEventListener('click', analizarDistribuidorProfundo);

    const btnRefresh = document.getElementById('btnRefreshResearch');
    if (btnRefresh) btnRefresh.addEventListener('click', actualizarResearch);

    const btnEstrategia = document.getElementById('btnGenerarEstrategia');
    if (btnEstrategia) btnEstrategia.addEventListener('click', generarEstrategia);

    setupCopyButton();

    console.log('📊 Módulo analisis_mercado.js cargado (Serper + OpenAI web_search)');
});
