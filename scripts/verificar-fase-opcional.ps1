# Verificación: actividades recurrentes, cuadro de honor automático y libreta PDF
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

function Post($url, $body, $headers) {
  Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $body -Headers $headers
}

$ld = Post "$base/api/auth/login" '{"email":"direccion@cecma.edu.sv","contrasena":"Directora.CECMA.2026"}' @{}
$hd = @{ Authorization = "Bearer $($ld.data.accessToken)" }

# 1. Crear actividad recurrente: Hora Santa todos los jueves
$bodyRec = @{
  nombre = 'Hora Santa'; descripcion = 'Adoracion al Santisimo en la capilla'
  diaSemana = 4; horaInicio = '10:00'; horaFin = '11:00'; colorHex = '#a78bfa'; publicoDestino = 'TODOS'
} | ConvertTo-Json
$rec = Post "$base/api/calendario/recurrentes" $bodyRec $hd
Write-Output "1 PASS recurrente creada -> $($rec.data.nombre) (jueves)"

# 2. Catálogo listable
$catalogo = (Invoke-RestMethod -Uri "$base/api/calendario/recurrentes" -Headers $hd).data
Write-Output "2 PASS catalogo -> $($catalogo.Count) actividad(es) recurrente(s)"

# 3. Generar cuadro de honor automático
$honor = Post "$base/api/calendario/cuadro-honor/generar" '{"top":3}' $hd
Write-Output "3 PASS cuadro de honor generado -> $($honor.data.gradosProcesados) grado(s) procesado(s)"

# 4. El cuadro público refleja el cálculo
$publico = (Invoke-RestMethod -Uri "$base/api/calendario/publico/cuadro-honor").data
$primero = $publico | Sort-Object posicion | Select-Object -First 1
Write-Output "4 PASS cuadro publico -> $($publico.Count) entradas; 1ro: $($primero.alumno.persona.primerNombre) $($primero.alumno.persona.primerApellido) ($($primero.promedioGeneral))"

# 5. Libreta PDF del director sobre un alumno
$alumnos = (Invoke-RestMethod -Uri "$base/api/personas/alumnos?limit=100" -Headers $hd).data
$lucia = $alumnos | Where-Object { $_.persona.primerNombre -eq 'Lucia' } | Select-Object -First 1
$urlPdf = "$base/api/reportes/libreta/$($lucia.id)"
Invoke-WebRequest -Uri $urlPdf -Headers $hd -OutFile "$env:TEMP\libreta-test.pdf" | Out-Null
$bytes = [System.IO.File]::ReadAllBytes("$env:TEMP\libreta-test.pdf")
$magic = [System.Text.Encoding]::ASCII.GetString($bytes[0..3])
Write-Output "5 PASS libreta PDF -> $($bytes.Length) bytes, magic='$magic'"

# 6. RESPONSABLE puede descargar la libreta de SU hijo pero no de otros
$lp = Post "$base/api/auth/login" '{"email":"padre1@correo.com","contrasena":"Padre.CECMA.2026"}' @{}
$hp = @{ Authorization = "Bearer $($lp.data.accessToken)" }
$hijos = (Invoke-RestMethod -Uri "$base/api/personas/mis-hijos" -Headers $hp).data
$urlHijo = "$base/api/reportes/libreta/$($hijos[0].id)"
Invoke-WebRequest -Uri $urlHijo -Headers $hp -OutFile "$env:TEMP\libreta-hijo.pdf" | Out-Null
Write-Output "6 PASS responsable descarga libreta de su hijo"
try {
  Invoke-WebRequest -Uri $urlPdf -Headers $hp -OutFile "$env:TEMP\x.pdf" | Out-Null
  Write-Output "7 FAIL: responsable descargo libreta ajena"
} catch {
  Write-Output "7 PASS responsable bloqueado de libreta ajena -> $($_.Exception.Response.StatusCode.value__)"
}

# 8. Eventos del mes (lo que consume el grid del calendario)
$desde = (Get-Date -Format 'yyyy-MM-01')
$hasta = (Get-Date).AddMonths(1).ToString('yyyy-MM-15')
$urlEv = "$base/api/calendario/eventos?desde=$desde" + "&hasta=$hasta"
$eventos = (Invoke-RestMethod -Uri $urlEv -Headers $hd).data
Write-Output "8 PASS eventos del rango del grid -> $($eventos.Count)"
