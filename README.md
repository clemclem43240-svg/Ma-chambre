# Ma chambre

Appli téléphone pour piloter ma chambre : Xbox et télé, météo réelle, présence de l'iPhone, agenda, rappels, notifications, lumières Hue (chevet, plafonnier/bureau, ruban sous le canapé), volets et porte de garage Somfy. Mode démo tant que Home Assistant n'est pas branché.

Adresse : https://clemclem43240-svg.github.io/Ma-chambre/

Installer sur iPhone : ouvrir le lien dans Safari → Partager → « Sur l'écran d'accueil ».

## Tableau de bord tablette

Adresse : https://clemclem43240-svg.github.io/Ma-chambre/tablette/

Météo réelle (Open-Meteo), heure, Xbox et télé, présence de l'iPhone, agenda, rappels et notifications. Mode démo tant que Home Assistant n'est pas branché. L'adresse et la clé de Home Assistant se saisissent dans Réglages et restent uniquement sur la tablette, jamais dans ce dépôt.

## Brancher sur Home Assistant

Safari refuse qu'une page en https (GitHub Pages) parle à Home Assistant en http sur le réseau local. On installe donc une copie de l'appli **dans** Home Assistant (dossier `www` de la configuration) et on l'ouvre depuis le wifi de la maison :

- Téléphone : `http://<adresse-de-home-assistant>:8123/local/ma-chambre/index.html`
- Tablette : `http://<adresse-de-home-assistant>:8123/local/ma-chambre/tablette/index.html`

Installation (une fois) : `git clone --depth 1 https://github.com/clemclem43240-svg/Ma-chambre.git <config>/www/ma-chambre` puis redémarrer Home Assistant. Mise à jour : `git -C <config>/www/ma-chambre pull`.

L'adresse se remplit toute seule ; il reste à coller un jeton longue durée dans Réglages puis « Tester », qui trouve les appareils. Le jeton reste sur l'appareil, jamais dans ce dépôt.
