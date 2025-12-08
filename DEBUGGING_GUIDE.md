# 🔍 Contract Debugging Guide

## Issues You're Experiencing

You mentioned three issues:
1. **Does the game call the contract to submit scores?** → ✅ YES
2. **Does staking go to the contract pool?** → ✅ YES
3. **Leaderboard shows nothing** → ⚠️ Likely because no scores have been submitted yet

---

## How the Flow Works

### 1. Staking Flow (payEntry)
```
User clicks "INSERT COIN"
→ Approve cUSD (1 cUSD allowance to contract)
→ Contract calls cUSD.transferFrom()
→ Contract splits: 95% to prize pool, 5% to house fees
→ Game unlocked for user
```

**Check Console Logs:**
```
[STAKING] 📊 Approve hash received: 0x...
[STAKING] ✅ cUSD approved!
[STAKING] ✅ Entry fee paid successfully!
```

### 2. Score Submission Flow (submitScore)
```
Game ends with score
→ User clicks "SUBMIT SCORE"
→ Contract receives score via submitScore(uint256)
→ Contract checks if score qualifies for top 10
→ If yes, updates leaderboard
```

**Check Console Logs:**
```
[SCORE SUBMIT] 🎯 Starting score submission process...
[SCORE SUBMIT] ✅ Score submitted successfully!
[SCORE SUBMIT] 📝 Transaction hash: 0x...
```

### 3. Leaderboard Fetch Flow
```
User opens Leaderboard scene
→ React calls getCurrentLeaderboard()
→ Contract returns Player[10] array
→ Filter out empty entries (address(0))
→ Display results
```

**Check Console Logs:**
```
[LEADERBOARD] 📋 Leaderboard requested
[LEADERBOARD] 📦 Raw leaderboard data from contract: [...]
[LEADERBOARD] ✅ Formatted leaderboard (filtered): [...]
```

---

## 🐛 Common Issues & Solutions

### Issue: "Leaderboard shows nothing"

**Possible Causes:**
1. **No scores submitted yet** → This is the most likely cause!
2. **Wrong network** → Make sure you're on Celo Sepolia (chain ID: 11142220)
3. **Contract not initialized** → Check if contract has any entries

**How to Verify:**

Open browser console and run:
```javascript
// Check if you're on the right network
console.log('Chain ID:', window.ethereum.chainId);
// Should be '0xaa36a7' (11142220 in hex)

// Check wallet connection
console.log('Connected:', window.ethereum.selectedAddress);
```

**Solution Steps:**
1. Open the game
2. Connect your MiniPay wallet
3. Stake 1 cUSD (click "INSERT COIN")
4. Play the game
5. When game ends, click "SUBMIT SCORE"
6. Wait for confirmation
7. Open Leaderboard - you should see your score!

---

## 📊 Testing the Contract Manually

### Test 1: Check if contract has any scores

Open console and check logs when you open the leaderboard:

```
[LEADERBOARD] Entry 1: { address: '0x0000...', score: '0', ... }
[LEADERBOARD] Entry 2: { address: '0x0000...', score: '0', ... }
...
```

If all 10 entries show address `0x0000...` and score `0`, then **no one has submitted scores yet**.

### Test 2: Verify your stake went through

After staking, check:
```
[STAKING] ✅ Entry fee paid successfully! Hash: 0x...
```

Copy that transaction hash and check on Celo Sepolia explorer:
https://sepolia.celoscan.io/tx/YOUR_HASH

### Test 3: Verify your score was submitted

After submitting score, check:
```
[SCORE SUBMIT] ✅ Score submitted successfully!
[SCORE SUBMIT] 📝 Transaction hash: 0x...
```

Copy that hash and verify on explorer.

---

## 🎯 Contract Functions Reference

### User Functions:
- `payEntry()` - Pay 1 cUSD to play
- `submitScore(uint256 score)` - Submit your score
- `getCurrentLeaderboard()` - View top 10 players
- `getMyScore()` - View your current high score

### Contract State:
- `currentDayId` - Current tournament day ID
- `tournaments[dayId]` - Tournament data for specific day
- `playerHighScores[dayId][address]` - Player's high score for the day

---

## 🔧 Quick Diagnostic Commands

Add this to your browser console to debug:

```javascript
// Check if score submission function exists
console.log('submitScore exists:', typeof submitScore === 'function');

// Check current score state
console.log('Current score:', currentScore);

// Check if wallet is connected
console.log('Wallet:', address);
console.log('Has staked:', hasStaked);
```

---

## ⚠️ Known Issues

### Issue: Contract doesn't verify player paid entry before submitting score

**Impact:** Players could submit scores without paying (though this doesn't affect your prize pool).

**Solution:** The contract should add this check in `submitScore()`:
```solidity
function submitScore(uint256 score) external {
    require(hasPlayed[currentDayId][msg.sender], "Must pay entry fee first");
    // ... rest of function
}
```

This is a contract-level fix that would require redeployment.

---

## 📝 Next Steps

1. **Test the full flow:**
   - Connect wallet
   - Stake 1 cUSD
   - Play game
   - Submit score
   - Check leaderboard

2. **Check console logs** at each step

3. **Verify transactions** on Celo Sepolia block explorer

4. **Report any errors** with the console logs

---

## 💡 Helpful Tips

- **Leaderboard updates immediately** after successful score submission
- **Scores are stored on-chain** - they persist forever
- **Tournament resets daily** at midnight WAT (11 PM UTC)
- **Prize distribution** happens automatically when tournament resets

---

## 🆘 Still Having Issues?

Check these logs in order:
1. `[STAKING]` - Did stake transaction succeed?
2. `[SCORE SUBMIT]` - Did score transaction succeed?
3. `[LEADERBOARD]` - What does raw data show?

If all transactions succeed but leaderboard is empty, try:
- Wait a few seconds for blockchain confirmation
- Refresh the page
- Reconnect wallet
- Check you're on the correct network (Celo Sepolia)
