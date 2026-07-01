export class SaveSystem {
    static KEY = 'rugo_save_v1';

    static getDefault() {
        return {
            version: '1.0',
            coins: 0,
            gems: 3,
            unlockedHeroes: ['rugo'],
            selectedHero: 'rugo',
            levelsCompleted: [],
            currentLevel: 1,
            settings: {
                musicVolume: 0.7,
                sfxVolume: 0.8,
                language: 'ru'
            },
            stats: {
                totalPlayTime: 0,
                totalKills: 0,
                deaths: 0,
                bossKills: 0
            }
        };
    }

    static load() {
        try {
            const raw = localStorage.getItem(SaveSystem.KEY);
            if (!raw) return SaveSystem.getDefault();
            const data = JSON.parse(raw);
            return Object.assign(SaveSystem.getDefault(), data);
        } catch (e) {
            console.warn('SaveSystem: load failed, using defaults', e);
            return SaveSystem.getDefault();
        }
    }

    static save(data) {
        try {
            localStorage.setItem(SaveSystem.KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('SaveSystem: save failed', e);
        }
    }

    static reset() {
        localStorage.removeItem(SaveSystem.KEY);
    }
}
