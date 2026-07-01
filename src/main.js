import { Game } from './core/Game.js';
import { SaveSystem } from './core/SaveSystem.js';

async function init() {
    const game = new Game();

    try {
        await game.loadData();
    } catch (e) {
        console.error('Failed to load game data:', e);
        document.body.innerHTML = '<div style="color:#fff;padding:40px;font-size:20px;">Ошибка загрузки данных игры. Проверьте, что игра запущена через веб-сервер (http://localhost/games/RUGO).</div>';
        return;
    }

    document.getElementById('loadingScreen').classList.remove('active');

    setupButtons(game);
    game.start();

    window._game = game;
}

function setupButtons(game) {
    const onClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => fn());
    };

    onClick('btnStart', () => {
        document.getElementById('currencyBar').style.display = 'flex';
        game.showLevelSelect();
    });
    onClick('btnShop', () => {
        document.getElementById('currencyBar').style.display = 'flex';
        game.showShop();
    });
    onClick('btnShop2', () => game.showShop());
    onClick('btnReset', () => {
        if (confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) {
            SaveSystem.reset();
            location.reload();
        }
    });

    onClick('btnLevelBack', () => game.ui.showScreen('mainMenu'));
    onClick('btnHeroSelect', () => game.showHeroSelect());
    onClick('btnHeroBack', () => game.showLevelSelect());
    onClick('btnShopBack', () => game.ui.showScreen('mainMenu'));

    onClick('btnNextLevel', () => {
        const currentId = game.currentLevelData.id;
        const nextLevel = game.levelsData.levels.find(l => l.id === currentId + 1);
        if (nextLevel) {
            game.startLevel(nextLevel);
        } else {
            game.backToMenu();
            game.ui.showNotification('🎉 Вы прошли все уровни!', 4000);
        }
    });

    onClick('btnVictoryMenu', () => {
        document.getElementById('currencyBar').style.display = 'none';
        game.backToMenu();
    });
    onClick('btnRetry', () => game.retryLevel());
    onClick('btnDefeatMenu', () => {
        document.getElementById('currencyBar').style.display = 'none';
        game.backToMenu();
    });
}

init();
