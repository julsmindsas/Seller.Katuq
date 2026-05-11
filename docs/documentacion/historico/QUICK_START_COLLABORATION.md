# 🚀 Quick Start - Agent Collaboration

**5 Minutes to Agent Team Communication**

---

## ⚡ Prerequisites

- Backend running: `npm run start-express` (port 3000)
- Frontend running: `npm start` (port 4200)
- KAI backend ready (if using collaboration)

---

## 🎬 Quick Start (5 Steps)

### Step 1: Create First Agent (Sales)
```
1. Open: http://localhost:4200/agent-builder/wizard

2. Step 1 (Info):
   - Name: "Sales Assistant"
   - Department: "Sales"

3. Step 2 (Prompt):
   - Keep default

4. Step 3 (Tools): ⭐ NEW EXPERIENCE!

   SELECT FROM PURPLE SECTION:
   ☑ getTotalSales

   SCROLL DOWN TO GREEN SECTION:
   ☑ callSubAgent
   ☑ listTeamMembers

   You should see: "3 herramientas seleccionadas"

5. Step 4 (Review & Create):
   - Click "Crear Agente"
```

### Step 2: Create Second Agent (Inventory)
```
1. Open: http://localhost:4200/agent-builder/wizard

2. Step 1 (Info):
   - Name: "Inventory Manager"
   - Department: "Inventory"

3. Step 2 (Prompt):
   - Keep default

4. Step 3 (Tools):

   SELECT FROM PURPLE SECTION:
   ☑ getProductStock

   SELECT FROM GREEN SECTION:
   ☑ callSubAgent
   ☑ listTeamMembers

   You should see: "3 herramientas seleccionadas"

5. Step 4 (Review & Create):
   - Click "Crear Agente"
```

### Step 3: Execute Sales Agent
```
1. Go to: http://localhost:4200/agent-builder/library
2. Find "Sales Assistant" → Click "Ejecutar"
3. Type: "¿Con quién puedo coordinar?"
4. Watch as agent:
   - Calls listTeamMembers()
   - Discovers "Inventory Manager"
   - Reports back available team
```

### Step 4: Execute Inventory Agent
```
1. Go to: http://localhost:4200/agent-builder/library
2. Find "Inventory Manager" → Click "Ejecutar"
3. Type: "¿Con quién puedo hablar?"
4. Watch as agent discovers the Sales Assistant
```

### Step 5: Coordinate Cross-Department
```
1. Go back to Sales Assistant execution
2. Type: "¿Me puedes preguntar al Inventory Manager si tenemos stock?"
3. Watch as:
   - Sales Agent calls listTeamMembers() ✓
   - Sales Agent calls callSubAgent("Inventory Manager", "¿Stock?")
   - Inventory Manager responds with stock info
   - Sales Agent consolidates response
```

---

## 🎯 What You'll See in UI

### Collaboration Section (NEW!)

```
┌─────────────────────────────────────────────────────┐
│ 🤝 Herramientas de Colaboración      3 seleccionadas│
│ Permite que tu agente se comunique con otros...     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [👥 callSubAgent icon]     [👥 listTeamMembers]    │
│  Calls other agents         Discovers team members │
│  for data/coordination      in the company         │
│          ✓                           ✓              │
│                                                      │
└─────────────────────────────────────────────────────┘

GREEN THEME = Collaboration tools (easy to spot!)
PURPLE THEME = Regular department tools
```

---

## 🔍 How It Actually Works

### Behind the Scenes Flow

```
User Input to Sales Agent:
  "Can you ask Inventory about stock?"
              ↓
Sales Agent (with callSubAgent tool):
  1. Calls: listTeamMembers()
     Result: ["Inventory Manager", ...]

  2. Calls: callSubAgent("Inventory Manager", "Stock?")

  3. Inventory Manager executes (same conversation)
     Returns: "500 units available"

  4. Sales Agent consolidates:
     "Inventory has 500 units available"
              ↓
Response to User: ✅ Complete answer
```

### What Gets Logged

Every collaboration is logged:

```json
{
  "type": "sub_agent_call",
  "from_agent": "Sales Assistant",
  "to_agent": "Inventory Manager",
  "task": "Check stock availability",
  "response": "500 units available",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

---

## 📋 Checklists

### ✅ After Creating Your First Agent

- [ ] Agent appears in library
- [ ] Can see selected tools in agent details
- [ ] Both regular tools AND collaboration tools are shown
- [ ] Green collaboration section visible in wizard

### ✅ After Executing Agent with Collaboration Tools

- [ ] Agent responds to normal queries ✓
- [ ] Agent can list team members ✓
- [ ] Agent can coordinate with other agents ✓
- [ ] Conversation log shows A2A calls ✓

### ✅ Cross-Department Coordination

- [ ] Created 2+ agents in different departments
- [ ] Both have collaboration tools selected
- [ ] Agent 1 can call Agent 2 ✓
- [ ] Agent 2 responds with data ✓
- [ ] Both responses show in conversation ✓

---

## 🐛 Troubleshooting

### Problem: Collaboration tools not showing in wizard

**Solution**:
```bash
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard refresh frontend (Ctrl+Shift+R)
3. Check backend is running (npm run start-express)
4. Check /v1/agent-builder/catalog/tools includes callSubAgent
```

### Problem: Agent can't call another agent

**Solution**:
```bash
1. Verify both agents have callSubAgent in selectedTools
2. Check both agents are in same company
3. Check agent names are spelled correctly
4. Check backend console for errors
```

### Problem: Collaboration tools appear in purple, not green

**Solution**:
```bash
1. Hard refresh browser (Ctrl+Shift+R)
2. Check SCSS compiled correctly
3. Check collaboration category is 'collaboration' (not 'collaboracion')
```

---

## 🎨 Visual Quick Reference

### Wizard Step 3 Sections

```
BEFORE (Purple Tools Only):
┌──────────────────────────┐
│ getTotalSales ✓          │
│ getTopProducts           │
│ getCustomerInfo          │
└──────────────────────────┘

AFTER (With Collaboration):
┌──────────────────────────┐
│ getTotalSales ✓          │  ← Purple (department tools)
│ getTopProducts           │
│ getCustomerInfo          │
├──────────────────────────┤
│ callSubAgent ✓           │  ← Green (collaboration tools)
│ listTeamMembers          │
└──────────────────────────┘
```

---

## 💡 Pro Tips

### Tip 1: Give Descriptive Names
```
❌ Bad:    "Agent1", "Agent2", "AgentX"
✅ Good:   "Supervisor Stock", "Encargado Despachos", "Manager Ventas"

Why? So they're easy to identify when calling via callSubAgent()
```

### Tip 2: Use Department-Specific Prompts
```
For Inventory:
"You are the inventory supervisor. Help with stock questions.
If asked about other departments, use callSubAgent to coordinate."

For Logistics:
"You manage shipments. For stock info, coordinate with inventory team
using callSubAgent. For sales info, call sales team."
```

### Tip 3: Include Both Discovery Tools
```
❌ Missing listTeamMembers:
   Agent doesn't know who to call

✅ With listTeamMembers:
   Agent can dynamically discover team
   No hardcoding needed
```

### Tip 4: Mix Department + Collaboration Tools
```
❌ Only department tools:
   Agent can only respond, not coordinate

✅ Department + Collaboration tools:
   Agent can execute own tasks AND call colleagues
   Creates real team behavior
```

---

## 📱 Mobile Friendly?

Yes! The collaboration section is fully responsive:

```
Desktop:
┌─────────────────────────────┐
│ 🤝 callSubAgent │ listTeamMembers │
└─────────────────────────────┘

Mobile:
┌──────────────┐
│ 🤝 callSubAgent  │
├──────────────┤
│ listTeamMembers  │
└──────────────┘
```

---

## 🎓 What's Different from Before?

### Before (No Collaboration)
```
Agent A: Executes only its tools
Agent B: Executes only its tools
User: Must coordinate manually between agents
```

### After (With Collaboration)
```
Agent A: Executes its tools + calls Agent B if needed
Agent B: Responds to Agent A + returns data
User: Just talks to Agent A, it handles coordination!
```

---

## 🚀 Next Level Usage

### Multi-Level Coordination
```
User: "What's the complete status?"
  ↓
Manager Agent (Sales):
  1. Calls: Inventory Manager → "Stock OK"
  2. Calls: Logistics Manager → "Ready to dispatch"
  3. Calls: Finance Agent → "Payment processed"
  4. Consolidates: "Everything is ready!"
```

### Team Decision Making
```
User: "Should we launch the promotion?"
  ↓
Manager Agent:
  1. Calls: Sales Agent → "Strong demand"
  2. Calls: Inventory → "Sufficient stock"
  3. Calls: Logistics → "Can handle volume"
  4. Decides: "Yes, launch promotion!"
```

---

## 📞 Support

### Still stuck?

Check the full documentation:
- **COLLABORATION_TOOLS_IMPLEMENTATION.md** - Complete technical details
- **A2A_COLLABORATION_SUMMARY.md** - Architecture overview
- Backend: `/kai/functions/src/tools/catalog.ts`
- Frontend: `/Seller.Katuq/src/app/modules/agent-builder/wizard/step-tools/`

---

## ✅ Success Criteria

You know it's working when:

```
1. ✓ Collaboration section appears in purple wizard (green theme)
2. ✓ Can select callSubAgent and listTeamMembers
3. ✓ Counter shows "2 seleccionadas" or more
4. ✓ Agent executes and can call other agents
5. ✓ Conversation shows A2A calls in the log
6. ✓ User sees coordinated response from multiple agents
```

---

## 🎉 You're Ready!

Your agent team is now operational. Go create, coordinate, and collaborate! 🚀

**Time to first team conversation: ~5 minutes**
**Complexity: Zero - it's all UI-based**
**Power: Maximum - real team coordination**

Enjoy! 🎊
