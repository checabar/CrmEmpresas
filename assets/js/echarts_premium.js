// ============================================
// ECHARTS PREMIUM - GRÁFICOS PROFESIONALES
// ============================================

// Colores corporativos
const colors = {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#a855f7',
    pink: '#ec4899',
    gradient1: ['#667eea', '#764ba2'],
    gradient2: ['#f093fb', '#f5576c'],
    gradient3: ['#4facfe', '#00f2fe']
};

// ============================================
// FUNNEL CHART - EMBUDO DE VENTAS
// ============================================

function renderChartEmbudo(data) {
    const chartDom = document.getElementById('chartEmbudo');
    if (!chartDom) {
        console.error('❌ Elemento chartEmbudo no encontrado');
        return;
    }

    const myChart = echarts.init(chartDom);

    // Contar por etapa del pipeline
    const etapas = {
        'nuevo': 0,
        'contactado': 0,
        'calificado': 0,
        'propuesta': 0,
        'negociacion': 0,
        'cerrado_ganado': 0
    };

    data.forEach(d => {
        const etapa = d.etapa_pipeline || 'nuevo';
        if (etapas.hasOwnProperty(etapa)) {
            etapas[etapa]++;
        }
    });

    const funnelData = [
        { value: etapas.nuevo + etapas.contactado + etapas.calificado + etapas.propuesta + etapas.negociacion + etapas.cerrado_ganado, name: 'Nuevos' },
        { value: etapas.contactado + etapas.calificado + etapas.propuesta + etapas.negociacion + etapas.cerrado_ganado, name: 'Contactados' },
        { value: etapas.calificado + etapas.propuesta + etapas.negociacion + etapas.cerrado_ganado, name: 'Calificados' },
        { value: etapas.propuesta + etapas.negociacion + etapas.cerrado_ganado, name: 'Propuesta' },
        { value: etapas.negociacion + etapas.cerrado_ganado, name: 'Negociación' },
        { value: etapas.cerrado_ganado, name: 'Cerrado' }
    ];

    const option = {
        title: {
            text: 'Embudo de Ventas - Pipeline Comercial',
            left: 'center',
            textStyle: {
                color: '#f1f5f9',
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: '#475569',
            borderWidth: 1,
            textStyle: {
                color: '#f1f5f9'
            }
        },
        series: [
            {
                name: 'Pipeline',
                type: 'funnel',
                left: '10%',
                top: 60,
                bottom: 60,
                width: '80%',
                min: 0,
                max: Math.max(...funnelData.map(d => d.value)),
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: {
                    show: true,
                    position: 'inside',
                    formatter: '{b}: {c}',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                labelLine: {
                    length: 10,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                },
                itemStyle: {
                    borderColor: '#0f172a',
                    borderWidth: 2,
                    color: (params) => {
                        const colorList = ['#667eea', '#7c3aed', '#a855f7', '#c026d3', '#d946ef', '#10b981'];
                        return colorList[params.dataIndex];
                    }
                },
                emphasis: {
                    label: {
                        fontSize: 16
                    }
                },
                data: funnelData
            }
        ]
    };

    myChart.setOption(option);

    window.addEventListener('resize', () => {
        myChart.resize();
    });

    console.log('✅ Chart Embudo renderizado');
}

// ============================================
// BAR CHART - DISTRIBUCIÓN POR BARRIOS
// ============================================

function renderChartProvincias(data) {
    const chartDom = document.getElementById('chartProvincias');
    if (!chartDom) {
        console.error('❌ Elemento chartProvincias no encontrado');
        return;
    }

    const myChart = echarts.init(chartDom);

    // Contar por barrio
    const barriosMap = {};
    data.forEach(d => {
        const barrio = d.barrio || d['Barrio'] || 'Sin barrio';
        barriosMap[barrio] = (barriosMap[barrio] || 0) + 1;
    });

    // Top 10 barrios
    const sorted = Object.entries(barriosMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const provincias = sorted.map(s => s[0]);
    const valores = sorted.map(s => s[1]);

    const option = {
        title: {
            text: 'Top 10 Barrios',
            left: 'center',
            textStyle: {
                color: '#f1f5f9',
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: '#475569',
            borderWidth: 1,
            textStyle: {
                color: '#f1f5f9'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: 60,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: provincias,
            axisLabel: {
                rotate: 45,
                interval: 0,
                fontSize: 11,
                color: '#cbd5e1'
            },
            axisLine: {
                lineStyle: {
                    color: '#475569'
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#cbd5e1'
            },
            splitLine: {
                lineStyle: {
                    color: '#334155'
                }
            }
        },
        series: [
            {
                name: 'Empresas',
                type: 'bar',
                data: valores,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' }
                    ]),
                    borderRadius: [6, 6, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#764ba2' },
                            { offset: 1, color: '#667eea' }
                        ])
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 'bold'
                }
            }
        ]
    };

    myChart.setOption(option);

    window.addEventListener('resize', () => {
        myChart.resize();
    });

    console.log('✅ Chart Barrios renderizado');
}

// ============================================
// PIE CHART - DISTRIBUCIÓN POR CATEGORÍAS (SIN LEYENDA)
// ============================================

function renderChartCategorias(data) {
    const chartDom = document.getElementById('chartCategorias');
    if (!chartDom) {
        console.error('❌ Elemento chartCategorias no encontrado');
        return;
    }

    const myChart = echarts.init(chartDom);

    // Contar por categoría
    const categoriasMap = {};
    data.forEach(d => {
        const cat = d.categoria || 'Sin categoría';
        categoriasMap[cat] = (categoriasMap[cat] || 0) + 1;
    });

    const pieData = Object.entries(categoriasMap).map(([name, value]) => ({
        name,
        value
    }));

    const option = {
        title: {
            text: 'Distribución por Categoría',
            left: 'center',
            textStyle: {
                color: '#f1f5f9',
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: '#475569',
            borderWidth: 1,
            textStyle: {
                color: '#f1f5f9'
            }
        },
        legend: {
            show: false
        },
        series: [
            {
                name: 'Categorías',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '55%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#0f172a',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: '{b}\n{d}%',
                    color: '#f1f5f9',
                    fontSize: 11,
                    fontWeight: '600'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 13,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(102, 126, 234, 0.5)'
                    }
                },
                labelLine: {
                    show: true,
                    length: 15,
                    length2: 10,
                    lineStyle: {
                        color: '#64748b'
                    }
                },
                data: pieData,
                color: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#a855f7', '#ec4899']
            }
        ]
    };

    myChart.setOption(option);

    window.addEventListener('resize', () => {
        myChart.resize();
    });

    console.log('✅ Chart Categorías renderizado (sin leyenda)');
}

// ============================================
// BAR CHART - RESPONSABLES COMERCIALES
// ============================================

function renderChartResponsables(data) {
    const chartDom = document.getElementById('chartResponsables');
    if (!chartDom) {
        console.error('❌ Elemento chartResponsables no encontrado');
        return;
    }

    const myChart = echarts.init(chartDom);

    // Contar por responsable
    const responsablesMap = {};
    data.forEach(d => {
        const resp = d.responsable_comercial || 'Sin asignar';
        responsablesMap[resp] = (responsablesMap[resp] || 0) + 1;
    });

    const sorted = Object.entries(responsablesMap)
        .sort((a, b) => b[1] - a[1]);

    const responsables = sorted.map(s => s[0]);
    const valores = sorted.map(s => s[1]);

    const option = {
        title: {
            text: 'Distribución por Responsable',
            left: 'center',
            textStyle: {
                color: '#f1f5f9',
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: '#475569',
            borderWidth: 1,
            textStyle: {
                color: '#f1f5f9'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: 60,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: responsables,
            axisLabel: {
                rotate: 45,
                interval: 0,
                fontSize: 11,
                color: '#cbd5e1'
            },
            axisLine: {
                lineStyle: {
                    color: '#475569'
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#cbd5e1'
            },
            splitLine: {
                lineStyle: {
                    color: '#334155'
                }
            }
        },
        series: [
            {
                name: 'Empresas asignadas',
                type: 'bar',
                data: valores,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#f093fb' },
                        { offset: 1, color: '#f5576c' }
                    ]),
                    borderRadius: [6, 6, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#f5576c' },
                            { offset: 1, color: '#f093fb' }
                        ])
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 'bold'
                }
            }
        ]
    };

    myChart.setOption(option);

    window.addEventListener('resize', () => {
        myChart.resize();
    });

    console.log('✅ Chart Responsables renderizado');
}

// ============================================
// CALENDARIO GOOGLE STYLE - PRÓXIMOS CONTACTOS
// ============================================

function renderChartPuntajes(data) {
    const chartDom = document.getElementById('chartPuntajes');
    if (!chartDom) {
        console.error('❌ Elemento chartPuntajes no encontrado');
        return;
    }

    // Limpiar el contenedor
    chartDom.innerHTML = '';
    chartDom.style.padding = '0';
    chartDom.style.overflow = 'hidden';

    // Filtrar distribuidores con fecha próxima acción
    const contactos = data
        .filter(d => d.fecha_proxima_accion)
        .map(d => {
            return {
                fecha: d.fecha_proxima_accion,
                nombre: d.nombre,
                accion: d.proxima_accion || 'Contactar'
            };
        });

    // Agrupar por fecha
    const fechasMap = {};
    contactos.forEach(c => {
        if (!fechasMap[c.fecha]) {
            fechasMap[c.fecha] = [];
        }
        fechasMap[c.fecha].push(c);
    });

    // Obtener mes actual
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth();
    
    const primerDia = new Date(añoActual, mesActual, 1);
    const ultimoDia = new Date(añoActual, mesActual + 1, 0);
    
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay(); // 0 = Domingo

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Crear HTML del calendario
    let html = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1e293b; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 12px 16px; background: #334155; border-bottom: 2px solid #475569;">
                <div style="color: #f1f5f9; font-size: 16px; font-weight: 700; text-align: center;">
                    ${meses[mesActual]} ${añoActual}
                </div>
                <div style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 4px;">
                    Próximos contactos programados
                </div>
            </div>
            
            <!-- Days header -->
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #334155; border-bottom: 1px solid #475569; padding: 8px 4px;">
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">DOM</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">LUN</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">MAR</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">MIÉ</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">JUE</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">VIE</div>
                <div style="text-align: center; color: #cbd5e1; font-size: 11px; font-weight: 600;">SÁB</div>
            </div>
            
            <!-- Calendar grid - MEJORADO -->
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(38px, 1fr); gap: 1px; background: #475569; padding: 1px;">
    `;

    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
        html += `<div style="background: #1e293b;"></div>`;
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaStr = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const contactosHoy = fechasMap[fechaStr] || [];
        const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && añoActual === hoy.getFullYear();
        
        let bgColor = '#1e293b';
        let textColor = '#cbd5e1';
        let dotColor = '';
        
        if (contactosHoy.length > 0) {
            // Colores según cantidad de contactos
            if (contactosHoy.length >= 5) {
                bgColor = 'rgba(239, 68, 68, 0.15)';
                dotColor = '#ef4444';
            } else if (contactosHoy.length >= 3) {
                bgColor = 'rgba(245, 158, 11, 0.15)';
                dotColor = '#f59e0b';
            } else {
                bgColor = 'rgba(102, 126, 234, 0.15)';
                dotColor = '#667eea';
            }
        }
        
        if (esHoy) {
            bgColor = 'rgba(102, 126, 234, 0.25)';
            textColor = '#ffffff';
        }

        html += `
            <div style="background: ${bgColor}; padding: 3px; position: relative; cursor: ${contactosHoy.length > 0 ? 'pointer' : 'default'}; transition: all 0.2s; display: flex; flex-direction: column;" 
                 onmouseover="this.style.background='${contactosHoy.length > 0 ? 'rgba(102, 126, 234, 0.3)' : bgColor}'"
                 onmouseout="this.style.background='${bgColor}'"
                 title="${contactosHoy.length > 0 ? contactosHoy.map(c => c.nombre + ': ' + c.accion).join('\\n') : ''}">
                <div style="color: ${textColor}; font-size: 11px; font-weight: ${esHoy ? '700' : '600'}; text-align: right;">
                    ${dia}
                </div>
                ${contactosHoy.length > 0 ? `
                    <div style="display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; justify-content: center; flex: 1; align-items: center;">
                        ${contactosHoy.slice(0, 3).map(() => `<div style="width: 5px; height: 5px; border-radius: 50%; background: ${dotColor};"></div>`).join('')}
                        ${contactosHoy.length > 3 ? `<div style="color: ${dotColor}; font-size: 8px; font-weight: 700;">+${contactosHoy.length - 3}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += `
            </div>
            
            <!-- Footer legend -->
            <div style="padding: 8px 12px; background: #334155; border-top: 1px solid #475569; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #667eea;"></div>
                    <span style="color: #cbd5e1; font-size: 10px;">1-2 contactos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></div>
                    <span style="color: #cbd5e1; font-size: 10px;">3-4 contactos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></div>
                    <span style="color: #cbd5e1; font-size: 10px;">5+ contactos</span>
                </div>
            </div>
        </div>
    `;

    chartDom.innerHTML = html;
    
    console.log('✅ Calendario Google Style renderizado (optimizado para mostrar mes completo)');
}

// ============================================
// FUNCIÓN PRINCIPAL - Llamada desde app_secure.js
// ============================================

function renderCharts(data) {
    try {
        renderChartEmbudo(data);
    } catch (e) { console.error('❌ Error en Embudo:', e); }

    try {
        renderChartProvincias(data);
    } catch (e) { console.error('❌ Error en Provincias:', e); }

    try {
        renderChartCategorias(data);
    } catch (e) { console.error('❌ Error en Categorías:', e); }

    try {
        renderChartResponsables(data);
    } catch (e) { console.error('❌ Error en Responsables:', e); }

    try {
        renderChartPuntajes(data);
    } catch (e) { console.error('❌ Error en Calendario:', e); }

    // Stats del embudo
    try {
        const cerrados = data.filter(d => d.etapa_pipeline === 'cerrado_ganado').length;
        const total = data.length;
        document.getElementById('conversionRate').textContent = total > 0 ? Math.round(cerrados / total * 100) + '%' : '0%';
        document.getElementById('enPipeline').textContent = data.filter(d => ['primer_contacto', 'seguimiento', 'negociacion'].includes(d.etapa_pipeline)).length;
        document.getElementById('valorPipeline').textContent = '-';
        const puntajes = data.filter(d => d.puntaje).map(d => d.puntaje);
        document.getElementById('promedioPuntaje').textContent = puntajes.length > 0 ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : '0';
    } catch (e) { console.error('❌ Error en stats embudo:', e); }
}

// Exponer globalmente
window.renderCharts = renderCharts;

console.log('✅ echarts_premium.js cargado correctamente');
