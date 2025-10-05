'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA GENERAL Y CONSTANTES ---
    const NUM_MAX_JUGADORES = 50; 
    let jugadores = []; // Usado para la entrada secuencial de nombres
    let jugadorActualIndex = 1; // Contador para la entrada secuencial
    
    // Variables del estado del juego (usadas en pantalla_juego.html)
    // AHORA: 'jugadoresEnJuego' contendrá a TODOS, incluidos los ganadores fijos.
    let jugadoresEnJuego = []; 
    let turnoActual = 0; // Índice en el array jugadoresEnJuego
    let rondaActual = 1;
    let configPartida = null;
    let ganadores = {}; // {puesto: {nombre: 'X', puntos: Y, ...}} (Solo para registro de puestos fijos)
    let puestosAsignados = 0; // Contador de puestos fijos asignados (1º, 2º, 3º...)

    // ====================================================================
    // 1, 2, 3: LÓGICA DE CONFIGURACIÓN (SIN CAMBIOS)
    // ====================================================================
    const botonEmpezar = document.getElementById('botonEmpezar');
    if (botonEmpezar) {
        botonEmpezar.addEventListener('click', function() {
            window.location.href = 'modo_juego.html'; 
        });
    }

    const tarjetasModo = document.querySelectorAll('.tarjeta-modo');
    tarjetasModo.forEach(tarjeta => {
        tarjeta.addEventListener('click', function() {
            const modoElegido = tarjeta.getAttribute('data-modo'); 
            
            if (modoElegido === 'individual') {
                window.location.href = 'juego_individual.html'; 
            } else if (modoElegido === 'equipo') {
                alert('¡Has elegido Equipo! (Próximo paso: configuración de equipos)');
            }
        });
    });

    const formIndividual = document.getElementById('formConfiguracionIndividual');
    const numPuestosInput = document.getElementById('numPuestos');
    const numJugadoresInput = document.getElementById('numJugadores');
    const puntajeMaximoInput = document.getElementById('puntajeMaximo'); 
    const contenedorPremios = document.getElementById('contenedorPremios');

    if (formIndividual) {
        numJugadoresInput.max = NUM_MAX_JUGADORES;
        numPuestosInput.max = NUM_MAX_JUGADORES; 
        
        if (puntajeMaximoInput) {
            puntajeMaximoInput.value = ''; 
        }

        // --- FUNCIÓN PARA GENERAR LOS CAMPOS DE PREMIO ---
        function generarCamposPremios() {
            const numPuestos = parseInt(numPuestosInput.value) || 0;
            const numJugadores = parseInt(numJugadoresInput.value) || 0;

            if (numPuestos > 0 && numJugadores > 0 && numPuestos > numJugadores) {
                numPuestosInput.setCustomValidity(`Los puestos ganadores no pueden exceder la cantidad de jugadores (${numJugadores}).`);
                numPuestosInput.reportValidity();
                contenedorPremios.innerHTML = '';
                return;
            } else {
                numPuestosInput.setCustomValidity(''); 
            }
            
            let htmlPremios = '';
            if (numPuestos > 0) {
                htmlPremios += '<h3>Asignación de Premios</h3>';
                for (let i = 1; i <= numPuestos; i++) {
                    const sufijo = i === 1 ? 'er' : (i === 3 ? 'er' : 'to');
                    htmlPremios += `
                        <div class="input-group">
                            <label for="premio-${i}">Premio ${i}${sufijo} Puesto:</label>
                            <input type="number" 
                                   id="premio-${i}" 
                                   name="premio-${i}" 
                                   placeholder="Valor del premio (Ej. 5000)" 
                                   min="0"
                                   required 
                                   class="input-premio">
                        </div>
                    `;
                }
            }
            contenedorPremios.innerHTML = htmlPremios;
        }

        // --- EVENTOS Y FUNCIÓN DE SUBMIT DEL FORMULARIO DE CONFIGURACIÓN ---
        numJugadoresInput.addEventListener('input', generarCamposPremios);
        numPuestosInput.addEventListener('input', generarCamposPremios);

        formIndividual.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            if (!formIndividual.checkValidity()) {
                alert('Por favor, completa todos los campos requeridos y revisa las validaciones.');
                return;
            }

            const numJ = parseInt(numJugadoresInput.value);
            const puestos = parseInt(numPuestosInput.value);
            const puntajeMaximo = parseInt(puntajeMaximoInput.value); 
            const premios = {};

            if (puestos > numJ) {
                 numPuestosInput.setCustomValidity(`Los puestos ganadores no pueden exceder la cantidad de jugadores (${numJ}).`);
                 numPuestosInput.reportValidity();
                 return;
            }

            for (let i = 1; i <= puestos; i++) {
                const inputPremio = document.getElementById(`premio-${i}`);
                if (inputPremio) {
                    premios[i] = parseInt(inputPremio.value) || 0;
                }
            }

            const configuracion = {
                modo: 'individual',
                numJugadores: numJ,
                puntajeObjetivo: puntajeMaximo, 
                puestosGanadores: puestos,
                premios: premios
            };

            localStorage.setItem('configPartida', JSON.stringify(configuracion));
            
            // --- LIMPIEZA COMPLETA DE ESTADO ANTERIOR ---
            localStorage.removeItem('jugadoresOrdenados');
            localStorage.removeItem('jugadoresEnJuegoActual'); 
            localStorage.removeItem('ganadores');
            localStorage.removeItem('puestosAsignados');
            localStorage.removeItem('turnoActual');
            localStorage.removeItem('rondaActual');
            // ---------------------------------------------
            
            window.location.href = 'pantalla_nombres.html'; 
        });
        
        generarCamposPremios(); 
    }

    // ====================================================================
    // 4. LÓGICA PARA ENTRADA SECUENCIAL DE NOMBRES Y SORTEO (pantalla_nombres.html)
    // ====================================================================
    const formNombres = document.getElementById('formNombresJugadores');
    const inputNombreActual = document.getElementById('nombreJugadorActual');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const tituloJugadorActual = document.getElementById('tituloJugadorActual');
    const resultadoSorteoDiv = document.getElementById('resultadoSorteo');
    const listaOrdenada = document.getElementById('listaOrden');
    const btnEmpezarJuego = document.getElementById('btnEmpezarJuego');
    const mensajeSorteo = document.getElementById('mensajeSorteo');
    const efectoRuleta = document.getElementById('efectoRuleta');

    if (formNombres) {
        
        const configJSON = localStorage.getItem('configPartida');
        if (!configJSON) {
            window.location.href = 'juego_individual.html';
            return;
        }
        const config = JSON.parse(configJSON);
        const numJugadoresTotal = config.numJugadores;

        // --- FUNCIÓN PARA ACTUALIZAR LA VISTA DE ENTRADA ---
        function actualizarEntrada() {
            tituloJugadorActual.textContent = `Ingresa el nombre del Jugador ${jugadorActualIndex} de ${numJugadoresTotal}`;
            
            if (jugadorActualIndex === numJugadoresTotal) {
                btnSiguiente.textContent = 'Realizar Sorteo';
            } else {
                btnSiguiente.textContent = 'Siguiente';
            }

            inputNombreActual.value = '';
            inputNombreActual.focus();
        }

        // --- FUNCIÓN PARA MEZCLAR EL ARRAY (Fisher-Yates) ---
        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            
            // 1. Realizar el shuffle de los objetos de jugador (que solo tienen { nombre: 'X' })
            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                
                [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex], array[currentIndex]];
            }
            
            // 2. Inicializar las propiedades de juego (CORRECCIÓN 1: Añadir 'haGanado')
            return array.map(jugador => ({
                nombre: jugador.nombre,
                puntos: 0,
                ultimoLanzamiento: 0, 
                puesto: 0,
                haGanado: false // <--- NUEVA PROPIEDAD CLAVE
            }));
        }

        // --- MANEJO DEL SUBMIT (SIGUIENTE O SORTEAR) ---
        formNombres.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!inputNombreActual.value.trim()) {
                alert('Por favor, ingresa un nombre para continuar.');
                inputNombreActual.focus();
                return;
            }

            // 1. Guardar el nombre del jugador actual (solo nombre en esta etapa)
            jugadores.push({
                nombre: inputNombreActual.value.trim(),
            });

            // 2. Verificar si hay más jugadores
            if (jugadorActualIndex < numJugadoresTotal) {
                jugadorActualIndex++;
                actualizarEntrada();
            } else {
                // 3. Ya se tienen todos los nombres -> INICIAR SORTEO
                formNombres.classList.add('hidden');
                tituloJugadorActual.classList.add('hidden');
                resultadoSorteoDiv.classList.remove('hidden');
                
                iniciarSorteoVisual(jugadores);
            }
        });
        
        // --- FUNCIÓN PARA EL EFECTO VISUAL DE RULETA DE 3 SEGUNDOS ---
        function iniciarSorteoVisual(jugadoresArray) {
            const DURACION_SORTEO = 3000; 
            const INTERVALO = 100;

            mensajeSorteo.textContent = '¡PREPARANDO EL ORDEN DE JUEGO!';
            efectoRuleta.classList.remove('hidden'); 
            efectoRuleta.classList.add('ruleta-activa');
            
            let indiceRuleta = 0;
            const intervaloRuleta = setInterval(() => {
                efectoRuleta.textContent = jugadoresArray[indiceRuleta].nombre;
                indiceRuleta = (indiceRuleta + 1) % jugadoresArray.length;
            }, INTERVALO);

            // 1. Terminar el efecto de ruleta y revelar el resultado
            setTimeout(() => {
                clearInterval(intervaloRuleta);
                efectoRuleta.classList.remove('ruleta-activa');

                // 2. Realizar el sorteo final (mezcla y añade propiedades de juego)
                const ordenSorteado = shuffle(jugadoresArray);

                // 3. Mostrar el resultado final
                mensajeSorteo.textContent = '¡SORTEO FINALIZADO! Orden de Participación:';
                efectoRuleta.classList.add('hidden');
                
                listaOrdenada.classList.remove('hidden');
                listaOrdenada.innerHTML = '';
                
                ordenSorteado.forEach((jugador, index) => {
                    const li = document.createElement('li');
                    li.textContent = `${index + 1}. ${jugador.nombre}`;
                    li.style.animationDelay = `${index * 0.2}s`; 
                    listaOrdenada.appendChild(li);
                });
                
                // 4. Guardar la lista de jugadores ya ORDENADA con datos de juego iniciales
                localStorage.setItem('jugadoresOrdenados', JSON.stringify(ordenSorteado));

                // 5. Mostrar botón para comenzar
                btnEmpezarJuego.classList.remove('hidden');

            }, DURACION_SORTEO);
        }

        // Inicializar la primera entrada al cargar la página
        actualizarEntrada();
    }

    // Manejo de la redirección al juego (para el botón en pantalla_nombres.html)
    const btnEmpezarJuegoRedirect = document.getElementById('btnEmpezarJuego');
    if (btnEmpezarJuegoRedirect) {
        btnEmpezarJuegoRedirect.addEventListener('click', function() {
            // Limpiar estados de juego persistentes que no son la configuración ni el orden inicial
            localStorage.removeItem('ganadores');
            localStorage.removeItem('puestosAsignados');
            localStorage.removeItem('turnoActual');
            localStorage.removeItem('rondaActual');
            // NO eliminamos 'jugadoresEnJuegoActual', ya que se cargará la lista completa (jugadoresOrdenados)
            window.location.href = 'pantalla_juego.html'; 
        });
    }


    // ====================================================================
    // 5. LÓGICA DE JUEGO Y PUNTUACIÓN (pantalla_juego.html)
    // ====================================================================
    
    // --- FUNCIÓN PARA CALCULAR LA TABLA Y ORDENAR ---
    // CORRECCIÓN 2: Modificar ordenamiento para respetar los puestos fijos ('haGanado')
    function getTablaOrdenada(jugadoresList) {
        // Clonar y ordenar: Los ganadores fijos (haGanado: true) van primero, luego por puntos.
        const jugadoresOrdenados = [...jugadoresList].sort((a, b) => {
            // 1. Priorizar jugadores con puesto fijo asignado (los ganadores del 1º, 2º, etc.)
            if (a.haGanado && b.haGanado) {
                return a.puesto - b.puesto; // Ordena por el número de puesto (1, 2, 3...)
            }
            if (a.haGanado) return -1; // 'a' va antes
            if (b.haGanado) return 1;  // 'b' va antes

            // 2. Para el resto (no ganadores fijos), ordenar por puntaje (descendente)
            return b.puntos - a.puntos;
        });
        
        let puestoActual = puestosAsignados + 1; // Empezar la asignación visual después del último puesto fijo
        
        for (let i = 0; i < jugadoresOrdenados.length; i++) {
            const jugador = jugadoresOrdenados[i];
            
            // Si ya tiene un puesto fijo (haGanado: true), no recalcular su puesto visual.
            if (jugador.haGanado) {
                 // El puesto ya está fijo. Continuar.
            } else {
                // Calcular puesto visual para los que aún están en juego
                // Usamos el índice de la lista ordenada para calcular el puesto visual.
                if (i > 0 && !jugadoresOrdenados[i - 1].haGanado && jugador.puntos < jugadoresOrdenados[i - 1].puntos) {
                     puestoActual = i + 1;
                }
                jugador.puesto = puestoActual;
            }

            // Calcular 'Falta para Ganar'
            jugador.faltaParaGanar = configPartida.puntajeObjetivo - jugador.puntos;
            if (jugador.faltaParaGanar < 0) {
                jugador.faltaParaGanar = 0;
            }
        }
        return jugadoresOrdenados;
    }

    function actualizarTablaPosiciones() {
        const cuerpoTabla = document.getElementById('cuerpoTablaPosiciones');
        if (!cuerpoTabla) return;

        // Ahora, solo usamos jugadoresEnJuego que contiene a todos.
        const jugadoresOrdenados = getTablaOrdenada(jugadoresEnJuego);
        let html = '';

        jugadoresOrdenados.forEach(jugador => {
            // Usamos la nueva propiedad 'haGanado'
            const esGanadorFijo = jugador.haGanado; 
            
            const claseGanador = esGanadorFijo ? 'ganador-puesto' : '';

            // Mostrar el puesto o el ícono de ganador
            const puestoDisplay = esGanadorFijo ? `🏆 ${jugador.puesto}` : jugador.puesto;

            // Mostrar el último lanzamiento o '-'
            const ultimoLanzamientoDisplay = jugador.ultimoLanzamiento === 0 && !esGanadorFijo ? '-' : jugador.ultimoLanzamiento;
            
            // Mostrar la leyenda '¡GANADOR!' si ya ganó
            const faltaParaGanarDisplay = esGanadorFijo ? '¡GANADOR!' : jugador.faltaParaGanar;


            html += `
                <tr class="${claseGanador}">
                    <td>${puestoDisplay}</td>
                    <td>${jugador.nombre}</td>
                    <td>${jugador.puntos}</td>
                    <td>${ultimoLanzamientoDisplay}</td>
                    <td>${faltaParaGanarDisplay}</td>
                </tr>
            `;
        });

        cuerpoTabla.innerHTML = html;
        
        // Guardar el estado actual (clave: jugadoresEnJuego ya tiene a todos)
        localStorage.setItem('jugadoresEnJuegoActual', JSON.stringify(jugadoresEnJuego)); 
        // Ya no guardamos 'ganadores', solo 'puestosAsignados'
        localStorage.setItem('puestosAsignados', puestosAsignados);
        localStorage.setItem('turnoActual', turnoActual);
        localStorage.setItem('rondaActual', rondaActual);
    }
    
    // --- FUNCIÓN PARA ACTUALIZAR LA VISTA DE TURNO (CORRECCIÓN 3: Saltar ganadores) ---
    function actualizarVistaTurno() {
        
        const jugadoresActivos = jugadoresEnJuego.filter(j => !j.haGanado);
        
        if (jugadoresActivos.length === 0) {
            terminarJuego();
            return;
        }
        
        // CORRECCIÓN CLAVE: Asegurarse de que el jugador en 'turnoActual' NO haya ganado.
        // Si el jugador actual ya ganó, avanzar el turno hasta encontrar uno activo.
        if (jugadoresEnJuego[turnoActual].haGanado) {
             avanzarTurno(true); // Usamos 'true' para forzar la búsqueda si el índice actual es un ganador
        }

        const lanzando = jugadoresEnJuego[turnoActual];
        
        let preparadoNombre = 'Nadie se prepara';
        
        // Buscar el siguiente jugador que NO haya ganado para la tarjeta "preparado"
        let siguienteIndice = (turnoActual + 1) % jugadoresEnJuego.length;
        let contador = 0;
        
        while (jugadoresEnJuego[siguienteIndice].haGanado && contador < jugadoresEnJuego.length) {
            siguienteIndice = (siguienteIndice + 1) % jugadoresEnJuego.length;
            contador++;
        }
        
        if (contador < jugadoresEnJuego.length) {
            preparadoNombre = jugadoresEnJuego[siguienteIndice].nombre;
        }
        
        document.getElementById('jugadorLanzando').textContent = lanzando.nombre;
        document.getElementById('jugadorPreparado').textContent = preparadoNombre;
        document.getElementById('tituloRonda').textContent = `Ronda ${rondaActual}`;

        const inputPuntaje = document.getElementById('puntajeLanzamiento');
        if (inputPuntaje) {
            inputPuntaje.value = '';
            inputPuntaje.focus();
        }
    }
    
    function terminarJuego() {
        // Ocultar la sección de acción (formulario y tarjetas de turno)
        const contenedorAccion = document.querySelector('.contenedor-accion');
        const tarjetaPreparado = document.querySelector('.tarjeta-jugador-preparado');
        const formPuntaje = document.getElementById('formPuntaje');
        const tituloRonda = document.getElementById('tituloRonda');
        
        if (contenedorAccion) contenedorAccion.classList.add('hidden');
        if (tarjetaPreparado) tarjetaPreparado.classList.add('hidden');
        if (formPuntaje) formPuntaje.classList.add('hidden');
        if (tituloRonda) tituloRonda.classList.add('hidden');
        
        // Mostrar el contenedor de resultados finales
        const resultadoFinalDiv = document.getElementById('resultadoFinalJuego');
        if (resultadoFinalDiv) resultadoFinalDiv.classList.remove('hidden');

        // Llenar la lista de ganadores (usando jugadoresEnJuego)
        const listaGanadoresDiv = document.getElementById('listaGanadoresFinal');
        if (!listaGanadoresDiv) return;
        
        // Filtramos y ordenamos solo los que tienen puesto asignado (los ganadores fijos)
        const ganadoresFinal = jugadoresEnJuego
            .filter(j => j.haGanado)
            .sort((a, b) => a.puesto - b.puesto); // Ordenar por el puesto asignado (1º, 2º...)

        listaGanadoresDiv.innerHTML = '';
        
        ganadoresFinal.forEach(jugador => {
            const puesto = jugador.puesto;
            const premio = configPartida.premios[puesto] ? `$${configPartida.premios[puesto].toLocaleString('es-CO')}` : 'N/A';
            
            listaGanadoresDiv.innerHTML += `
                <p style="font-size: 1.2rem; font-weight: bold; margin: 10px 0;">
                    🏆 Puesto ${puesto}: ${jugador.nombre} (Puntaje Total: ${jugador.puntos}) - Premio: ${premio}
                </p>
            `;
        });
    }
    
    // --- FUNCIÓN PARA VERIFICAR GANADORES (CORRECCIÓN 4: Asignar puesto fijo sin eliminar) ---
    function verificarGanadores() {
        
        // Si ya asignamos todos los puestos ganadores, no hacemos nada más.
        if (puestosAsignados >= configPartida.puestosGanadores) {
            return false;
        }

        // Buscamos al jugador del turno actual
        const jugadorLanzando = jugadoresEnJuego[turnoActual];

        // Verificar si el jugador actual superó el objetivo Y aún no ha ganado un puesto fijo
        if (!jugadorLanzando.haGanado && jugadorLanzando.puntos >= configPartida.puntajeObjetivo) {
            
            puestosAsignados++;
            
            if (puestosAsignados <= configPartida.puestosGanadores) {
                 // Asignar el puesto fijo (el que le corresponde por orden de victoria)
                 jugadorLanzando.haGanado = true;
                 jugadorLanzando.puesto = puestosAsignados; // El primero que gana es 1º, el segundo 2º, etc.
                 return true; // Se asignó un nuevo ganador
            } else {
                 // Si superó el objetivo pero ya se llenaron los puestos, no se hace nada.
                 puestosAsignados--; // Revertir el contador
                 return false;
            }
        }
        return false;
    }

    // --- FUNCIÓN PARA AVANZAR TURNO (CORRECCIÓN 5: Saltar a ganadores fijos) ---
    function avanzarTurno(forzarBusqueda = false) {
        
        // Empezar a buscar desde el siguiente índice
        let siguienteIndice = (turnoActual + 1) % jugadoresEnJuego.length;
        let contador = 0;

        // Iterar hasta encontrar un jugador que NO ha ganado
        while (jugadoresEnJuego[siguienteIndice].haGanado && contador < jugadoresEnJuego.length) {
            siguienteIndice = (siguienteIndice + 1) % jugadoresEnJuego.length;
            contador++;
        }
        
        // Si el índice siguiente es menor que el actual, significa que completamos una ronda
        if (siguienteIndice < turnoActual && !forzarBusqueda) {
            rondaActual++;
        }
        
        turnoActual = siguienteIndice;
    }


    // ====================================================================
    // LÓGICA DE SUBMIT DEL PUNTAJE EN PANTALLA_JUEGO
    // ====================================================================
    const formPuntaje = document.getElementById('formPuntaje');

    if (formPuntaje) {
        // 1. Cargar Configuración y Estado Previo del Juego
        configPartida = JSON.parse(localStorage.getItem('configPartida'));
        
        const estadoJuegoGuardado = localStorage.getItem('jugadoresEnJuegoActual'); 
        if (estadoJuegoGuardado) {
             jugadoresEnJuego = JSON.parse(estadoJuegoGuardado);
        } else {
             jugadoresEnJuego = JSON.parse(localStorage.getItem('jugadoresOrdenados')) || [];
        }

        // Ya no se usa la variable 'ganadores' de estado.
        // ganadores = JSON.parse(localStorage.getItem('ganadores')) || {}; 
        puestosAsignados = parseInt(localStorage.getItem('puestosAsignados') || 0);
        turnoActual = parseInt(localStorage.getItem('turnoActual') || 0);
        rondaActual = parseInt(localStorage.getItem('rondaActual') || 1);
        
        // Si no hay jugadores, o la configuración está mal, redirigir.
        if (!configPartida || jugadoresEnJuego.length === 0) {
             window.location.href = 'index.html';
             return;
        }

        const jugadoresActivosTotal = jugadoresEnJuego.filter(j => !j.haGanado).length;

        // 2. Manejar el envío del puntaje
        formPuntaje.addEventListener('submit', function(event) {
            event.preventDefault();

            const inputPuntaje = document.getElementById('puntajeLanzamiento');
            const puntaje = parseInt(inputPuntaje.value);
            
            // Validación de puntaje: solo -10 o valores positivos/cero (>= 0)
            if (isNaN(puntaje) || (puntaje < -10 || (puntaje < 0 && puntaje !== -10))) {
                alert('Puntaje no válido. Solo se acepta -10 o valores positivos/cero.');
                inputPuntaje.focus();
                return;
            }

            const jugadorLanzando = jugadoresEnJuego[turnoActual];
            
            // 3. Aplicar puntaje
            // CORRECCIÓN 6: Bloquear la aplicación de puntaje si el jugador ya ganó
            if (!jugadorLanzando.haGanado) {
                jugadorLanzando.puntos += puntaje;
                jugadorLanzando.ultimoLanzamiento = puntaje;
            } else {
                 // Si el jugador ya ganó, no se debería haber llegado aquí, pero es una capa de seguridad.
                 alert(`¡${jugadorLanzando.nombre} ya ha ganado el puesto ${jugadorLanzando.puesto}!`);
                 return;
            }
            
            // 4. Verificar si se cumplió el objetivo y asignar puesto fijo (si aplica)
            verificarGanadores(); 

            // 5. Mover al siguiente turno activo.
            const jugadoresActivosRestantes = jugadoresEnJuego.filter(j => !j.haGanado).length;

            if (jugadoresActivosRestantes === 0 || puestosAsignados >= configPartida.puestosGanadores) {
                // Si ya no quedan jugadores activos o todos los puestos están llenos
                terminarJuego();
            } else {
                avanzarTurno();
            }
            
            // 6. Actualizar la interfaz
            actualizarTablaPosiciones();
            if (jugadoresActivosRestantes > 0) {
                actualizarVistaTurno();
            }
        });

        // 7. Inicializar la vista (al cargar la página)
        if (jugadoresActivosTotal === 0 || puestosAsignados >= configPartida.puestosGanadores) {
             terminarJuego();
        } else {
             actualizarTablaPosiciones();
             actualizarVistaTurno();
        }
    }

    // ====================================================================
    // 6. LÓGICA DE BOTÓN 'NUEVO JUEGO'
    // ====================================================================

    const btnNuevoJuego = document.getElementById('btnNuevoJuego');

    if (btnNuevoJuego) {
        btnNuevoJuego.addEventListener('click', function() {
            // Limpieza COMPLETA de todo el estado guardado
            localStorage.removeItem('configPartida');
            localStorage.removeItem('jugadoresOrdenados');
            localStorage.removeItem('jugadoresEnJuegoActual'); 
            localStorage.removeItem('puestosAsignados');
            localStorage.removeItem('turnoActual');
            localStorage.removeItem('rondaActual');
            
            // Redirigir a la página de selección de modo de juego
            window.location.href = 'modo_juego.html'; 
        });
    }

}); // Fin de document.addEventListener('DOMContentLoaded', function()
