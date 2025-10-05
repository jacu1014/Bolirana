'use strict';

document.addEventListener('DOMContentLoaded', function() {
    
    // Cargar el modo y configuración desde variables globales (window)
    const modoJuego = localStorage.getItem('modoJuego');
    const config = JSON.parse(localStorage.getItem('configPartida') || '{"numJugadores": 4}');
    // Usamos el número de jugadores configurado para el modo Individual
    const numJugadoresTotal = config.numJugadores || 4; 
    
    // Sincronizar variables globales de nombres
    let jugadores = window.jugadores;
    let jugadorActualIndex = window.jugadorActualIndex;

    // Elementos de UI
    const formNombres = document.getElementById('formNombresJugadores');
    // ID Correcto: nombreJugadorActual
    const inputNombreActual = document.getElementById('nombreJugadorActual'); 
    const btnSiguiente = document.getElementById('btnSortear'); // Botón de submit del form
    // Usamos tituloJugadorActual para la iteración de nombres
    const tituloJugadorActual = document.getElementById('tituloJugadorActual'); 
    const resultadoSorteoDiv = document.getElementById('resultadoSorteo');
    // ID Correcto: listaOrdenJugadores
    const listaOrdenada = document.getElementById('listaOrdenJugadores'); 
    const btnEmpezarJuego = document.getElementById('btnEmpezarJuego');
    const mensajeSorteo = document.getElementById('mensajeSorteo');
    const efectoRuleta = document.getElementById('nombreSorteado'); // ID de la ruleta
    
    // Elementos UI Modo Equipo
    const opcionModalidadDiv = document.getElementById('opcionModalidadLanzamiento');
    const selectModalidad = document.getElementById('modalidadLanzamiento');
    const tituloPrincipal = document.getElementById('tituloPrincipal');
    const contenedorEntradasNombres = document.getElementById('contenedorEntradasNombres');


    if (formNombres) {

        // --- ADAPTACIÓN DE VISTA PARA MODO EQUIPO ---
        if (modoJuego === 'equipo') {
            if (opcionModalidadDiv && selectModalidad) {
                opcionModalidadDiv.classList.remove('hidden');
                selectModalidad.required = true;
            }
            if(tituloPrincipal) tituloPrincipal.textContent = 'Ingreso de Jugadores (Modo Equipo)';
        } else {
            if (opcionModalidadDiv) opcionModalidadDiv.classList.add('hidden');
        }

        // --- FUNCIÓN PARA ACTUALIZAR LA VISTA DE ENTRADA (CLAVE) ---
        function actualizarEntrada() {
            if (modoJuego === 'individual') {
                // Título específico para Modo Individual
                tituloJugadorActual.textContent = `Ingresa el nombre del Jugador ${jugadorActualIndex} de ${numJugadoresTotal}`;
                
                // Si estamos en el último jugador, cambiamos el texto del botón.
                if (jugadorActualIndex === numJugadoresTotal) {
                    btnSiguiente.textContent = 'Realizar Sorteo';
                } else {
                    btnSiguiente.textContent = 'Siguiente';
                }
            } else { // Modo Equipo
                // El título muestra el número actual de jugador
                tituloJugadorActual.textContent = `Ingresa el nombre del Jugador ${jugadorActualIndex}`;
                
                // Si ya hay más de 2 jugadores, da la opción de seguir añadiendo o sortear.
                if (jugadores.length >= 2) {
                    btnSiguiente.textContent = 'Añadir más o Realizar Sorteo';
                } else {
                    btnSiguiente.textContent = 'Siguiente';
                }
            }

            if (inputNombreActual) {
                inputNombreActual.value = '';
                inputNombreActual.focus();
            }
        }

        // --- FUNCIÓN PARA MEZCLAR EL ARRAY (Fisher-Yates) ---
        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
            return array; 
        }

        // --- FUNCIÓN PARA EL EFECTO VISUAL DE RULETA Y ORDEN FINAL ---
        function iniciarSorteoVisual(jugadoresArray) {
            
            // Validación de modalidad de lanzamiento en Modo Equipo
            if (modoJuego === 'equipo' && (!selectModalidad || !selectModalidad.value)) {
                 alert('Por favor, selecciona una modalidad de lanzamiento para el juego en equipo.');
                 contenedorEntradasNombres.classList.remove('hidden');
                 resultadoSorteoDiv.classList.add('hidden');
                 return;
            }

            contenedorEntradasNombres.classList.add('hidden');
            formNombres.classList.add('hidden'); // Ocultar el form completo
            resultadoSorteoDiv.classList.remove('hidden');

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

            // Terminar el efecto de ruleta y revelar el resultado
            setTimeout(() => {
                clearInterval(intervaloRuleta);
                efectoRuleta.classList.remove('ruleta-activa');

                let ordenSorteado;

                if (modoJuego === 'equipo') {
                    let tempJugadores = [...jugadoresArray];
                    
                    if (tempJugadores.length % 2 !== 0) {
                        alert("Número impar de jugadores. El último jugador ingresado ('" + tempJugadores[tempJugadores.length - 1].nombre + "') lanzará dos veces por el equipo.");
                        tempJugadores.push(tempJugadores[tempJugadores.length - 1]);
                    }

                    const jugadoresMezclados = shuffle(tempJugadores); 
                    const parejasTemp = [];
                    let elementosParaSortear = [];
                    
                    for (let i = 0; i < jugadoresMezclados.length; i += 2) {
                        const pareja = {
                            id: (i / 2) + 1,
                            jugador1: jugadoresMezclados[i].nombre,
                            jugador2: jugadoresMezclados[i + 1].nombre,
                            puntos: 0,
                            ultimoLanzamiento: 0,
                            puesto: 0,
                            haGanado: false,
                            nombresDisplay: `${jugadoresMezclados[i].nombre} y ${jugadoresMezclados[i + 1].nombre}`
                        };
                        parejasTemp.push(pareja);
                        elementosParaSortear.push({ nombre: pareja.nombresDisplay, id: pareja.id });
                    }
                    
                    const ordenSorteadoNombres = shuffle(elementosParaSortear);
                    ordenSorteado = ordenSorteadoNombres.map(e => parejasTemp.find(p => p.id === e.id));
                    window.parejasEnJuego = parejasTemp; 

                    localStorage.setItem('modalidadLanzamiento', selectModalidad.value);
                    localStorage.setItem('parejasEnJuego', JSON.stringify(ordenSorteado));

                } else {
                    const jugadoresInicializados = jugadoresArray.map(jugador => ({
                        nombre: jugador.nombre,
                        puntos: 0,
                        ultimoLanzamiento: 0, 
                        puesto: 0,
                        haGanado: false 
                    }));
                    ordenSorteado = shuffle(jugadoresInicializados);
                    localStorage.setItem('jugadoresOrdenados', JSON.stringify(ordenSorteado));
                }

                // Mostrar el resultado final
                mensajeSorteo.textContent = '¡SORTEO FINALIZADO! Orden de Participación:';
                efectoRuleta.classList.add('hidden');
                
                listaOrdenada.classList.remove('hidden');
                listaOrdenada.innerHTML = '';
                
                ordenSorteado.forEach((entidad, index) => {
                    const li = document.createElement('li');
                    const nombreDisplay = entidad.nombre || entidad.nombresDisplay;
                    li.textContent = `${index + 1}. ${nombreDisplay}`;
                    li.style.animationDelay = `${index * 0.2}s`; 
                    listaOrdenada.appendChild(li);
                });
                
                btnEmpezarJuego.classList.remove('hidden');

            }, DURACION_SORTEO);
        }

        // --- MANEJO DEL SUBMIT (SIGUIENTE O SORTEAR) ---
        formNombres.addEventListener('submit', function(event) {
            event.preventDefault();

            if (!inputNombreActual || !inputNombreActual.value.trim()) {
                alert('Por favor, ingresa un nombre para continuar.');
                if (inputNombreActual) inputNombreActual.focus();
                return;
            }

            // 1. Guardar el nombre
            jugadores.push({ nombre: inputNombreActual.value.trim() });

            // 2. Verificar si es el momento de Sortear o si avanzamos
            let debeSortear = false;
            
            if (modoJuego === 'individual') {
                // En Modo Individual: Se sortea cuando se alcanza el total
                debeSortear = (jugadorActualIndex === numJugadoresTotal);
            } else { // Modo Equipo
                // En Modo Equipo: Se sortea si ya hay al menos 2 jugadores Y el botón lo indica
                const textoBoton = btnSiguiente.textContent.toLowerCase();
                debeSortear = (jugadores.length >= 2 && textoBoton.includes('sortear'));
            }

            if (debeSortear) {
                // Si es hora de sortear, verificar la modalidad y empezar el sorteo visual
                iniciarSorteoVisual(jugadores);
            } else {
                // Si aún quedan jugadores por ingresar (o es el inicio del Modo Equipo)
                jugadorActualIndex++;
                window.jugadorActualIndex = jugadorActualIndex;
                actualizarEntrada();
            }
        });
        
        // Inicializar la primera entrada al cargar la página
        actualizarEntrada();
    }

    // Manejo de la redirección al juego
    const btnEmpezarJuegoRedirect = document.getElementById('btnEmpezarJuego');
    if (btnEmpezarJuegoRedirect) {
        btnEmpezarJuegoRedirect.addEventListener('click', function() {
            // Limpiar estados de juego anteriores
            localStorage.removeItem('ganadores');
            localStorage.removeItem('puestosAsignados');
            localStorage.removeItem('turnoActual');
            localStorage.removeItem('rondaActual');
            window.location.href = 'pantalla_juego.html'; 
        });
    }

});