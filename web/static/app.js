document.addEventListener('DOMContentLoaded', () => {
    // Elements - Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    // Elements - Dashboard
    const queryInput = document.getElementById('query-input');
    const runBtn = document.getElementById('run-btn');
    const btnText = runBtn.querySelector('span');
    const btnLoader = runBtn.querySelector('.btn-loader');
    const errorBanner = document.getElementById('error-banner');
    const errorText = document.getElementById('error-text');
    const cacheBanner = document.getElementById('cache-banner');
    
    // Elements - SQL Lab
    const labQueryInput = document.getElementById('lab-query-input');
    const labParseBtn = document.getElementById('lab-parse-btn');
    const labAstOutput = document.getElementById('lab-ast-output');

    // Elements - Shield
    const shieldInput = document.getElementById('shield-input');
    const shieldResultCard = document.getElementById('shield-result-card');
    const shieldStatusText = document.getElementById('shield-status-text');
    const shieldReasonText = document.getElementById('shield-reason-text');

    // Elements - Explorer
    const explorerSchemaList = document.getElementById('explorer-schema-list');
    const explorerDetails = document.getElementById('explorer-details');

    // State
    let currentView = 'dashboard';
    let schemas = null;

    // --- NAVIGATION LOGIC ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            switchView(viewId);
        });
    });

    function switchView(viewId) {
        currentView = viewId;
        
        // Update Nav
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector(`.nav-item[data-view="${viewId}"]`).classList.add('active');

        // Update Views
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');

        // View Specific Initialization
        if (viewId === 'explorer' && !schemas) fetchSchemas();
        if (viewId === 'metrics') fetchStats();
    }

    // --- DASHBOARD LOGIC (Original Pipeline) ---
    const sections = {
        parser: document.getElementById('section-parser'),
        security: document.getElementById('section-security'),
        planner: document.getElementById('section-planner'),
        executor: document.getElementById('section-executor')
    };
    const connectors = document.querySelectorAll('.pipeline-connector');

    runBtn.addEventListener('click', async () => {
        const query = queryInput.value.trim();
        if (!query) return;

        resetUI();
        try {
            await executePipelineCascade(query);
        } catch (err) {
            showError(err.message);
        } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            runBtn.disabled = false;
        }
    });

    function resetUI() {
        errorBanner.classList.add('hidden');
        cacheBanner.classList.add('hidden');
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        runBtn.disabled = true;

        Object.values(sections).forEach(s => s.classList.remove('focus', 'done'));
        connectors.forEach(c => c.classList.remove('active'));
    }

    async function executePipelineCascade(query) {
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await response.json();

        if (data.cache_hit) {
            cacheBanner.classList.remove('hidden');
            connectors.forEach(c => c.classList.add('active'));
            Object.values(sections).forEach(s => s.classList.add('done'));
            updateResultsTab(data.results);
            updateMetrics(data.metrics);
            return;
        }

        // Phase 1: Parser
        connectors[0].classList.add('active');
        sections.parser.classList.add('focus');
        await delay(600);
        document.getElementById('ast-json').textContent = JSON.stringify(data.ast, null, 2);
        hljs.highlightElement(document.getElementById('ast-json'));
        sections.parser.classList.replace('focus', 'done');

        // Phase 2: Security
        connectors[1].classList.add('active');
        sections.security.classList.add('focus');
        await delay(600);
        updateSecurityUI(data.decision, 'sec-status', 'sec-reason');
        sections.security.classList.replace('focus', 'done');
        if (data.decision.Block) return;

        // Phase 3: Planner
        connectors[2].classList.add('active');
        sections.planner.classList.add('focus');
        await delay(600);
        updatePlanUI(data.plan);
        sections.planner.classList.replace('focus', 'done');

        // Phase 4: Executor
        connectors[3].classList.add('active');
        sections.executor.classList.add('focus');
        await delay(400);
        updateResultsTab(data.results);
        updateMetrics(data.metrics);
        sections.executor.classList.replace('focus', 'done');
    }

    // --- SQL LAB LOGIC ---
    labParseBtn.addEventListener('click', async () => {
        const query = labQueryInput.value.trim();
        if (!query) return;
        
        labParseBtn.disabled = true;
        labAstOutput.textContent = "Parsing...";

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await response.json();
            labAstOutput.textContent = JSON.stringify(data.ast || data.error, null, 2);
            hljs.highlightElement(labAstOutput);
        } catch (e) {
            labAstOutput.textContent = "Error: " + e.message;
        } finally {
            labParseBtn.disabled = false;
        }
    });

    // --- SHIELD LOGIC ---
    shieldInput.addEventListener('input', debounce(async () => {
        const query = shieldInput.value.trim();
        if (!query) {
            resetShield();
            return;
        }

        const response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        
        updateShieldUI(data.decision);
    }, 500));

    function updateShieldUI(dec) {
        shieldResultCard.className = 'sec-result-card';
        if (dec.Block) {
            shieldResultCard.classList.add('danger');
            shieldStatusText.textContent = "THREAT DETECTED";
            shieldReasonText.textContent = dec.Reason;
            document.querySelector('#shield-result-card .pulse-icon').textContent = '🚫';
        } else {
            shieldResultCard.classList.add('success');
            shieldStatusText.textContent = "QUERY SECURE";
            shieldReasonText.textContent = "No malicious patterns found in AST.";
            document.querySelector('#shield-result-card .pulse-icon').textContent = '✅';
        }
    }

    function resetShield() {
        shieldResultCard.className = 'sec-result-card';
        shieldStatusText.textContent = "Ready to Scan";
        shieldReasonText.textContent = "Enter a query to test security heuristics.";
        document.querySelector('#shield-result-card .pulse-icon').textContent = '🛡️';
    }

    // --- EXPLORER LOGIC ---
    async function fetchSchemas() {
        try {
            const response = await fetch('/api/schema');
            schemas = await response.json();
            renderSchemaList();
        } catch (e) {
            explorerSchemaList.innerHTML = `<div class="error-text">Failed to load schemas</div>`;
        }
    }

    function renderSchemaList() {
        explorerSchemaList.innerHTML = '';
        for (const [db, tables] of Object.entries(schemas)) {
            const dbDiv = document.createElement('div');
            dbDiv.className = 'schema-db';
            dbDiv.innerHTML = `
                <span class="db-name">${db}</span>
                <ul class="table-list">
                    ${tables.map(t => `<li class="table-item" data-db="${db}" data-table="${t.name}">${t.name}</li>`).join('')}
                </ul>
            `;
            explorerSchemaList.appendChild(dbDiv);
        }

        explorerSchemaList.querySelectorAll('.table-item').forEach(item => {
            item.addEventListener('click', () => {
                const db = item.getAttribute('data-db');
                const tableName = item.getAttribute('data-table');
                showTableDetails(db, tableName);
                
                explorerSchemaList.querySelectorAll('.table-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    function showTableDetails(db, tableName) {
        const table = schemas[db].find(t => t.name === tableName);
        explorerDetails.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--accent);">${db.toUpperCase()}.${tableName}</h3>
            <table style="font-size: 0.9rem;">
                <thead><tr><th>Column Name</th><th>Type (Inferred)</th></tr></thead>
                <tbody>
                    ${table.columns.map(c => `<tr><td>${c}</td><td>${inferType(c)}</td></tr>`).join('')}
                </tbody>
            </table>
            <div style="margin-top: 2rem;">
                <h4 style="margin-bottom: 0.5rem; opacity: 0.7;">Sample Data</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Fetching live samples from ${db} instance...</p>
            </div>
        `;
    }

    function inferType(col) {
        if (col.includes('id')) return 'SERIAL / INT';
        if (col.includes('at') || col.includes('timestamp')) return 'TIMESTAMP';
        if (col.includes('total') || col.includes('amount')) return 'DECIMAL';
        return 'VARCHAR(255)';
    }

    // --- HELPERS ---
    function updateSecurityUI(dec, statusId, reasonId) {
        const statusEl = document.getElementById(statusId);
        const reasonEl = document.getElementById(reasonId);
        statusEl.className = 'sec-status';
        if (dec.Block) {
            statusEl.textContent = "Blocked";
            statusEl.classList.add('blocked');
            reasonEl.textContent = dec.Reason;
        } else {
            statusEl.textContent = "Safe";
            statusEl.classList.add('safe');
            reasonEl.textContent = "Clean";
        }
    }

    function updatePlanUI(plan) {
        const container = document.getElementById('plan-container');
        container.innerHTML = '';
        plan.Steps.forEach(step => {
            const card = document.createElement('div');
            card.className = 'plan-card';
            card.innerHTML = `
                <div class="step-id">${step.ID}</div>
                <div class="step-details">
                    <div class="step-type">${step.Type}</div>
                    <div class="step-meta">
                        <span class="step-db">${step.Database || 'FEDERATOR'}</span>
                        <div style="font-size: 0.7rem; margin-top: 4px;"><code>${step.Query || ''}</code></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function updateResultsTab(rows) {
        const empty = document.getElementById('results-empty');
        const table = document.getElementById('results-table');
        const thead = document.getElementById('results-thead');
        const tbody = document.getElementById('results-tbody');
        
        if (!rows || rows.length === 0) {
            empty.classList.remove('hidden');
            table.classList.add('hidden');
            return;
        }

        empty.classList.add('hidden');
        table.classList.remove('hidden');
        thead.innerHTML = Object.keys(rows[0]).map(c => `<th>${c}</th>`).join('');
        tbody.innerHTML = rows.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
    }

    function updateMetrics(metrics) {
        if (!metrics) return;
        ['total', 'security', 'parse', 'plan', 'exec'].forEach(m => {
            const val = (metrics[m + '_time_ms'] || 0).toFixed(2) + 'ms';
            if (document.getElementById('m-' + m)) document.getElementById('m-' + m).textContent = val;
            if (document.getElementById('pm-' + m)) document.getElementById('pm-' + m).textContent = val;
        });
    }

    async function fetchStats() {
        const response = await fetch('/api/stats');
        const data = await response.json();
        const grid = document.getElementById('metrics-stats-grid');
        grid.innerHTML = '';
        for (const [db, stats] of Object.entries(data)) {
            const percent = (stats.active / stats.max) * 100;
            grid.innerHTML += `
                <div class="stat-card">
                    <div class="stat-header"><span>${db.toUpperCase()}</span><span>${stats.active}/${stats.max}</span></div>
                    <div class="gauge-bar"><div class="gauge-fill" style="width:${percent}%; background:${percent > 80 ? '#ef4444' : '#3b82f6'}"></div></div>
                </div>
            `;
        }
    }

    function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
