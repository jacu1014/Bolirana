'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // Cargar y sincronizar estados globales desde localStorage
    window.modoJuego = localStorage.getItem('modoJuego');
    window.modalidadLanzamiento = localStorage.getItem('modalidadLanzamiento');
    window.configPartida = JSON.parse(localStorage.getItem('configPartida') || '{}');
    window.puestosAsignados = parseInt(localStorage.getItem('puestosAsignados') || 0);
    window.turnoActual = parseInt(localStorage.getItem('turnoActual') || 0);
    window.rondaActual = parseInt(localStorage.getItem('rondaActual') || 1);

    if (modoJuego === 'equipo') {
        window.parejasEnJuego = JSON.parse(localStorage.getItem('parejasEnJuego') || '[]');
    } else {
        const estadoJuegoGuardado = localStorage.getItem('jugadoresEnJuegoActual'); 
        window.jugadoresEnJuego = estadoJuegoGuardado ? JSON.parse(estadoJuegoGuardado) : JSON.parse(localStorage.getItem('jugadoresOrdenados') || '[]');
    }

    // Usar variables de window
    const { configPartida, modoJuego, modalidadLanzamiento, jugadoresEnJuego, parejasEnJuego } = window;
    let { puestosAsignados, turnoActual, rondaActual } = window;


    // ====================================================================
    // 1. FUNCIONES DE GESTIÓN DE TURNO Y ORDEN
    // ====================================================================

    function avanzarTurnoEquipoConsecutivo(parejas, turnoActualGlobal) {
        const numParejas = parejas.length;
        const totalLanzamientosRonda = numParejas * 2;
        
        const proximoTurno = (turnoActualGlobal + 1) % totalLanzamientosRonda;
        const esJugador1 = proximoTurno < numParejas;
        const indicePareja = proximoTurno % numParejas;
        const pareja = parejas[indicePareja];
        
        const nombreLanzador = esJugador1 ? pareja.jugador1 : pareja.jugador2;
        const siguienteRonda = (proximoTurno === 0);
        
        return { nombreLanzador, idPareja: pareja.id, proximoTurnoGlobal: proximoTurno, siguienteRonda };
    }

    function avanzarTurnoEquipoIntercalado(parejas, turnoActualGlobal) {
        const numParejas = parejas.length;
        const totalLanzamientosCiclo = numParejas; 

        const proximoTurno = turnoActualGlobal + 1;
        const cicloGlobal = Math.floor(proximoTurno / totalLanzamientosCiclo);
        
        const esJugador1 = (cicloGlobal % 2 === 0); 
        const indicePareja = proximoTurno % totalLanzamientosCiclo;
        const pareja = parejas[indicePareja];

        const nombreLanzador = esJugador1 ? pareja.jugador1 : pareja.jugador2;
        const siguienteRonda = (proximoTurno % numParejas === 0);

        return { nombreLanzador, idPareja: pareja.id, proximoTurnoGlobal: proximoTurno, siguienteRonda };
    }

    function obtenerLanzadorActual(indice) {
        const entidades = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        
        if (modoJuego === 'equipo') {
            const totalLanzamientos = parejasEnJuego.length * 2;
            const indiceSimulacion = indice === 0 ? totalLanzamientos - 1 : indice - 1; 
            
            const funcAvance = modalidadLanzamiento === 'consecutivo' ? avanzarTurnoEquipoConsecutivo : avanzarTurnoEquipoIntercalado;
            const resultado = funcAvance(entidades, indiceSimulacion);
            
            const entidad = parejasEnJuego.find(p => p.id === resultado.idPareja);
            return { entidad, nombreLanzador: resultado.nombreLanzador, idPareja: resultado.idPareja };

        } else {
            return { entidad: entidades[indice], nombreLanzador: entidades[indice].nombre, idPareja: null };
        }
    }

    function avanzarTurnoIndividual() {
        let siguienteIndice = (turnoActual + 1) % jugadoresEnJuego.length;
        let contador = 0;

        while (jugadoresEnJuego[siguienteIndice].haGanado && contador < jugadoresEnJuego.length) {
            siguienteIndice = (siguienteIndice + 1) % jugadoresEnJuego.length;
            contador++;
        }
        
        if (siguienteIndice < turnoActual) {
            window.rondaActual++;
        }
        
        window.turnoActual = siguienteIndice;
        turnoActual = siguienteIndice; // Sincronizar localmente
    }


    // ====================================================================
    // 2. FUNCIONES DE TABLA Y JUEGO
    // ====================================================================

    function getTablaOrdenada(entidadesList) {
        const entidadesOrdenadas = [...entidadesList].sort((a, b) => {
            if (a.haGanado && b.haGanado) {
                return a.puesto - b.puesto;
            }
            if (a.haGanado) return -1;
            if (b.haGanado) return 1;
            return b.puntos - a.puntos;
        });
        
        let puestoActual = puestosAsignados + 1;
        
        for (let i = 0; i < entidadesOrdenadas.length; i++) {
            const entidad = entidadesOrdenadas[i];
            
            if (!entidad.haGanado) {
                if (i > 0) {
                    const entidadAnterior = entidadesOrdenadas[i - 1];
                    if (!entidadAnterior.haGanado && entidad.puntos < entidadAnterior.puntos) {
                         puestoActual = i + 1;
                    }
                }
                entidad.puesto = puestoActual;
            }

            entidad.faltaParaGanar = configPartida.puntajeObjetivo - entidad.puntos;
            if (entidad.faltaParaGanar < 0) entidad.faltaParaGanar = 0;
        }
        return entidadesOrdenadas;
    }

    function actualizarTablaPosiciones() {
        const cuerpoTabla = document.getElementById('cuerpoTablaPosiciones');
        if (!cuerpoTabla || !configPartida) return;

        const entidadesList = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        const entidadesOrdenadas = getTablaOrdenada(entidadesList);
        let html = '';

        entidadesOrdenadas.forEach(entidad => {
            const esGanadorFijo = entidad.haGanado; 
            const claseGanador = esGanadorFijo ? 'ganador-puesto' : '';
            const puestoDisplay = esGanadorFijo ? `🏆 ${entidad.puesto}` : entidad.puesto;
            const ultimoLanzamientoDisplay = entidad.ultimoLanzamiento === 0 && !esGanadorFijo ? '-' : entidad.ultimoLanzamiento;
            const faltaParaGanarDisplay = esGanadorFijo ? '¡GANADOR!' : entidad.faltaParaGanar;
            
            const nombreDisplay = modoJuego === 'equipo' ? entidad.nombresDisplay : entidad.nombre;

            html += `
                <tr class="${claseGanador}">
                    <td>${puestoDisplay}</td>
                    <td>${nombreDisplay}</td>
                    <td>${entidad.puntos}</td>
                    <td>${ultimoLanzamientoDisplay}</td>
                    <td>${faltaParaGanarDisplay}</td>
                </tr>
            `;
        });

        cuerpoTabla.innerHTML = html;
        
        // Guardar el estado actual en localStorage
        if (modoJuego === 'equipo') {
             localStorage.setItem('parejasEnJuego', JSON.stringify(parejasEnJuego));
        } else {
             localStorage.setItem('jugadoresEnJuegoActual', JSON.stringify(jugadoresEnJuego)); 
        }
        
        localStorage.setItem('puestosAsignados', puestosAsignados);
        localStorage.setItem('turnoActual', turnoActual);
        localStorage.setItem('rondaActual', rondaActual);
    }
    
    function actualizarVistaTurno() {
        if (!configPartida) return;
        
        const entidadesEnJuego = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        const entidadesActivas = entidadesEnJuego.filter(e => !e.haGanado);
        
        if (entidadesActivas.length === 0) {
            terminarJuego();
            return;
        }
        
        if (modoJuego === 'individual' && jugadoresEnJuego[turnoActual].haGanado) {
             avanzarTurnoIndividual();
        }

        const infoLanzando = obtenerLanzadorActual(turnoActual);
        let siguienteTurno = turnoActual;
        let preparadoNombre = 'Nadie se prepara';
        
        if (modoJuego === 'equipo') {
            const totalLanzamientos = parejasEnJuego.length * 2;
            let contadorSalto = 0;
            
            do {
                const funcAvance = modalidadLanzamiento === 'consecutivo' ? avanzarTurnoEquipoConsecutivo : avanzarTurnoEquipoIntercalado;
                const resultadoProximo = funcAvance(parejasEnJuego, siguienteTurno);
                siguienteTurno = resultadoProximo.proximoTurnoGlobal;
                
                const parejaProxima = parejasEnJuego.find(p => p.id === resultadoProximo.idPareja);

                if (!parejaProxima.haGanado) {
                    preparadoNombre = resultadoProximo.nombreLanzador;
                    break;
                }
                contadorSalto++;
            } while (contadorSalto < totalLanzamientos * 2);

        } else {
            let siguienteIndice = (turnoActual + 1) % jugadoresEnJuego.length;
            let contador = 0;
            
            while (jugadoresEnJuego[siguienteIndice].haGanado && contador < jugadoresEnJuego.length) {
                siguienteIndice = (siguienteIndice + 1) % jugadoresEnJuego.length;
                contador++;
            }
            if (contador < jugadoresEnJuego.length) {
                preparadoNombre = jugadoresEnJuego[siguienteIndice].nombre;
            }
        }
        
        document.getElementById('jugadorLanzando').textContent = infoLanzando.nombreLanzador;
        document.getElementById('jugadorPreparado').textContent = preparadoNombre;
        document.getElementById('tituloRonda').textContent = `Ronda ${rondaActual}`;

        const inputPuntaje = document.getElementById('puntajeLanzamiento');
        if (inputPuntaje) {
            inputPuntaje.value = '';
            inputPuntaje.focus();
        }
    }

    function terminarJuego() {
        const contenedorAccion = document.querySelector('.contenedor-accion');
        const tarjetaPreparado = document.querySelector('.tarjeta-jugador-preparado');
        const formPuntaje = document.getElementById('formPuntaje');
        const tituloRonda = document.getElementById('tituloRonda');
        
        if (contenedorAccion) contenedorAccion.classList.add('hidden');
        if (tarjetaPreparado) tarjetaPreparado.classList.add('hidden');
        if (formPuntaje) formPuntaje.classList.add('hidden');
        if (tituloRonda) tituloRonda.classList.add('hidden');
        
        const resultadoFinalDiv = document.getElementById('resultadoFinalJuego');
        if (resultadoFinalDiv) resultadoFinalDiv.classList.remove('hidden');

        const listaGanadoresDiv = document.getElementById('listaGanadoresFinal');
        if (!listaGanadoresDiv) return;
        
        const entidadesList = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        
        const ganadoresFinal = entidadesList
            .filter(e => e.haGanado)
            .sort((a, b) => a.puesto - b.puesto);

        listaGanadoresDiv.innerHTML = '';
        
        ganadoresFinal.forEach(entidad => {
            const puesto = entidad.puesto;
            const premio = configPartida.premios && configPartida.premios[puesto] ? `$${configPartida.premios[puesto].toLocaleString('es-CO')}` : 'N/A';
            const nombreDisplay = modoJuego === 'equipo' ? entidad.nombresDisplay : entidad.nombre;
            
            listaGanadoresDiv.innerHTML += `
                <p style="font-size: 1.2rem; font-weight: bold; margin: 10px 0;">
                    🏆 Puesto ${puesto}: ${nombreDisplay} (Puntaje Total: ${entidad.puntos}) - Premio: ${premio}
                </p>
            `;
        });
    }

    function verificarGanadores() {
        
        if (puestosAsignados >= configPartida.puestosGanadores) {
            return false;
        }

        const entidadesList = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        let entidadLanzando;
        
        if (modoJuego === 'equipo') {
            const infoLanzando = obtenerLanzadorActual(turnoActual);
            entidadLanzando = entidadesList.find(p => p.id === infoLanzando.idPareja);
        } else {
            entidadLanzando = entidadesList[turnoActual];
        }

        if (entidadLanzando && !entidadLanzando.haGanado && entidadLanzando.puntos >= configPartida.puntajeObjetivo) {
            
            window.puestosAsignados++;
            puestosAsignados = window.puestosAsignados; // Sincronizar localmente
            
            if (puestosAsignados <= configPartida.puestosGanadores) {
                 entidadLanzando.haGanado = true;
                 entidadLanzando.puesto = puestosAsignados;
                 return true;
            } else {
                 window.puestosAsignados--;
                 puestosAsignados = window.puestosAsignados; // Sincronizar localmente
                 return false;
            }
        }
        return false;
    }


    // ====================================================================
    // 3. LÓGICA DE SUBMIT DEL PUNTAJE
    // ====================================================================
    
    const formPuntaje = document.getElementById('formPuntaje');

    if (formPuntaje) {

        const entidadesList = modoJuego === 'equipo' ? parejasEnJuego : jugadoresEnJuego;
        const jugadoresActivosTotal = entidadesList.filter(e => !e.haGanado).length;

        if (!configPartida || (modoJuego === 'equipo' && parejasEnJuego.length === 0) || (modoJuego === 'individual' && jugadoresEnJuego.length === 0)) {
             window.location.href = 'index.html';
             return;
        }

        formPuntaje.addEventListener('submit', function(event) {
            event.preventDefault();

            const inputPuntaje = document.getElementById('puntajeLanzamiento');
            const puntaje = parseInt(inputPuntaje.value);
            
            if (isNaN(puntaje) || (puntaje < -10 || (puntaje < 0 && puntaje !== -10))) {
                alert('Puntaje no válido. Solo se acepta -10 o valores positivos/cero.');
                inputPuntaje.focus();
                return;
            }

            let entidadLanzando;

            if (modoJuego === 'equipo') {
                const infoLanzando = obtenerLanzadorActual(turnoActual);
                entidadLanzando = entidadesList.find(p => p.id === infoLanzando.idPareja);
            } else {
                entidadLanzando = entidadesList[turnoActual];
            }
            
            if (!entidadLanzando.haGanado) {
                entidadLanzando.puntos += puntaje;
                entidadLanzando.ultimoLanzamiento = puntaje;
            } else {
                alert(`¡${entidadLanzando.nombre || entidadLanzando.nombresDisplay} ya ha ganado!`);
                return;
            }
            
            verificarGanadores(); 

            const jugadoresActivosRestantes = entidadesList.filter(e => !e.haGanado).length;

            if (jugadoresActivosRestantes === 0 || puestosAsignados >= configPartida.puestosGanadores) {
                terminarJuego();
            } else {
                if (modoJuego === 'equipo') {
                    const funcAvance = modalidadLanzamiento === 'consecutivo' ? avanzarTurnoEquipoConsecutivo : avanzarTurnoEquipoIntercalado;
                    
                    let resultadoAvance;
                    let siguienteTurno = turnoActual;
                    let contadorSalto = 0;
                    const totalLanzamientos = parejasEnJuego.length * 2;
                    
                    do {
                        resultadoAvance = funcAvance(entidadesList, siguienteTurno);
                        siguienteTurno = resultadoAvance.proximoTurnoGlobal;
                        contadorSalto++;
                    } while (entidadesList.find(p => p.id === resultadoAvance.idPareja).haGanado && contadorSalto < totalLanzamientos * 2);
                    
                    window.turnoActual = resultadoAvance.proximoTurnoGlobal;
                    turnoActual = window.turnoActual; // Sincronizar localmente

                    if (resultadoAvance.siguienteRonda) {
                        window.rondaActual++;
                        rondaActual = window.rondaActual; // Sincronizar localmente
                    }

                } else {
                    avanzarTurnoIndividual();
                }
            }
            
            actualizarTablaPosiciones();
            if (jugadoresActivosRestantes > 0) {
                actualizarVistaTurno();
            }
        });

        // 4. Inicializar la vista (al cargar la página)
        if (jugadoresActivosTotal === 0 || puestosAsignados >= configPartida.puestosGanadores) {
             terminarJuego();
        } else {
             actualizarTablaPosiciones();
             actualizarVistaTurno();
        }
    }

    // ====================================================================
    // 4. LÓGICA DE BOTÓN 'NUEVO JUEGO'
    // ====================================================================

    const btnNuevoJuego = document.getElementById('btnNuevoJuego');

    if (btnNuevoJuego) {
        btnNuevoJuego.addEventListener('click', function() {
            ['configPartida', 'jugadoresOrdenados', 'jugadoresEnJuegoActual', 'ganadores', 'puestosAsignados', 'turnoActual', 'rondaActual', 'parejasEnJuego', 'modalidadLanzamiento', 'modoJuego'].forEach(key => {
                localStorage.removeItem(key);
            });
            
            window.location.href = 'modo_juego.html'; 
        });
    }

});