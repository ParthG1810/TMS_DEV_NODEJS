/**
 * Customer Matching Service
 * Auto-matches Interac sender names to customers with fuzzy matching
 */

import { query } from '../config/database';
import { Customer, CustomerNameAlias } from '../types';

/**
 * Match result interface
 */
export interface CustomerMatchResult {
  customerId: number;
  customerName: string;
  confidence: number; // 0.00 to 1.00
  matchType: 'exact_alias' | 'fuzzy_name' | 'partial_name';
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0.00 to 1.00)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLen);
}

/**
 * Normalize name for comparison (uppercase, trim, remove extra spaces)
 */
function normalizeName(name: string): string {
  return name.toUpperCase().trim().replace(/\s+/g, ' ');
}

/**
 * Auto-match sender name to customer
 * Uses multiple matching strategies in order of confidence
 */
export async function autoMatchCustomer(senderName: string): Promise<CustomerMatchResult | null> {
  const normalizedSender = normalizeName(senderName);

  // Strategy 1: Exact match on aliases (confidence: 1.00)
  const exactAliasMatch = await query<(CustomerNameAlias & { customer_name: string })[]>(`
    SELECT cna.*, c.name as customer_name
    FROM customer_name_aliases cna
    JOIN customers c ON cna.customer_id = c.id
    WHERE UPPER(cna.alias_name) = ?
    LIMIT 1
  `, [normalizedSender]);

  if (exactAliasMatch.length > 0) {
    return {
      customerId: exactAliasMatch[0].customer_id,
      customerName: exactAliasMatch[0].customer_name,
      confidence: 1.00,
      matchType: 'exact_alias',
    };
  }

  // Strategy 2: Exact match on customer name (confidence: 0.95)
  const exactNameMatch = await query<Customer[]>(`
    SELECT * FROM customers
    WHERE UPPER(name) = ?
    LIMIT 1
  `, [normalizedSender]);

  if (exactNameMatch.length > 0) {
    return {
      customerId: exactNameMatch[0].id,
      customerName: exactNameMatch[0].name,
      confidence: 0.95,
      matchType: 'fuzzy_name',
    };
  }

  // Strategy 3: Fuzzy match on customer names (confidence: varies based on similarity)
  const allCustomers = await query<Customer[]>(`
    SELECT id, name FROM customers ORDER BY name
  `);

  let bestMatch: CustomerMatchResult | null = null;
  let bestSimilarity = 0;

  for (const customer of allCustomers) {
    const similarity = calculateSimilarity(normalizedSender, normalizeName(customer.name));

    // Only consider matches with > 70% similarity
    if (similarity > 0.70 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        customerId: customer.id,
        customerName: customer.name,
        confidence: similarity,
        matchType: 'fuzzy_name',
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // Strategy 4: Partial name match (first or last name) (confidence: 0.60)
  const nameParts = normalizedSender.split(' ').filter(p => p.length > 2);

  if (nameParts.length > 0) {
    // Build OR conditions for each name part
    const conditions = nameParts.map(() => 'UPPER(name) LIKE ?').join(' OR ');
    const params = nameParts.map(part => `%${part}%`);

    const partialMatches = await query<Customer[]>(`
      SELECT * FROM customers
      WHERE ${conditions}
      LIMIT 5
    `, params);

    if (partialMatches.length === 1) {
      // Only one match - higher confidence
      return {
        customerId: partialMatches[0].id,
        customerName: partialMatches[0].name,
        confidence: 0.65,
        matchType: 'partial_name',
      };
    } else if (partialMatches.length > 1) {
      // Multiple matches - find best similarity
      let bestPartialMatch: CustomerMatchResult | null = null;
      let bestPartialSimilarity = 0;

      for (const customer of partialMatches) {
        const similarity = calculateSimilarity(normalizedSender, normalizeName(customer.name));
        if (similarity > bestPartialSimilarity) {
          bestPartialSimilarity = similarity;
          bestPartialMatch = {
            customerId: customer.id,
            customerName: customer.name,
            confidence: Math.max(0.50, similarity * 0.8), // Cap at 80% of similarity
            matchType: 'partial_name',
          };
        }
      }

      return bestPartialMatch;
    }
  }

  // No match found
  return null;
}

/**
 * Learn a new customer alias from user confirmation
 */
export async function learnCustomerAlias(
  customerId: number,
  aliasName: string,
  createdBy?: number
): Promise<boolean> {
  const normalizedAlias = normalizeName(aliasName);

  try {
    // Check if alias already exists
    const existing = await query<CustomerNameAlias[]>(`
      SELECT id FROM customer_name_aliases WHERE UPPER(alias_name) = ?
    `, [normalizedAlias]);

    if (existing.length > 0) {
      // Already exists, might be for same or different customer
      return true;
    }

    // Insert new alias
    await query(`
      INSERT INTO customer_name_aliases (customer_id, alias_name, source, created_by)
      VALUES (?, ?, 'learned', ?)
    `, [customerId, aliasName.trim(), createdBy || null]);

    return true;
  } catch (error) {
    console.error('Error learning customer alias:', error);
    return false;
  }
}

/**
 * Add a manual customer alias
 */
export async function addManualAlias(
  customerId: number,
  aliasName: string,
  createdBy?: number
): Promise<boolean> {
  try {
    await query(`
      INSERT INTO customer_name_aliases (customer_id, alias_name, source, created_by)
      VALUES (?, ?, 'manual', ?)
    `, [customerId, aliasName.trim(), createdBy || null]);

    return true;
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      // Alias already exists
      return false;
    }
    throw error;
  }
}

/**
 * Get all aliases for a customer
 */
export async function getCustomerAliases(customerId: number): Promise<CustomerNameAlias[]> {
  return await query<CustomerNameAlias[]>(`
    SELECT * FROM customer_name_aliases
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `, [customerId]);
}

/**
 * Delete a customer alias
 */
export async function deleteCustomerAlias(aliasId: number): Promise<boolean> {
  const result = await query<any>(`
    DELETE FROM customer_name_aliases WHERE id = ?
  `, [aliasId]);

  return result.affectedRows > 0;
}

/**
 * Get suggested customers for a sender name
 * Returns top 5 matches with confidence scores
 */
export async function getSuggestedCustomers(senderName: string): Promise<CustomerMatchResult[]> {
  const normalizedSender = normalizeName(senderName);
  const suggestions: CustomerMatchResult[] = [];

  // Get all customers
  const allCustomers = await query<Customer[]>(`
    SELECT id, name FROM customers ORDER BY name
  `);

  // Calculate similarity for each customer
  for (const customer of allCustomers) {
    const similarity = calculateSimilarity(normalizedSender, normalizeName(customer.name));

    if (similarity > 0.30) { // Include any match > 30%
      suggestions.push({
        customerId: customer.id,
        customerName: customer.name,
        confidence: similarity,
        matchType: 'fuzzy_name',
      });
    }
  }

  // Sort by confidence and return top 5
  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions.slice(0, 5);
}
