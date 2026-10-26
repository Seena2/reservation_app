import Employee from '../models/employee.model.js';
/* Preventing Infinite Loops (Hierarchy Validation)
 An infinite loop happens if Employee A reports to Employee B, and Employee B is accidentally set to report to Employee A.
 To prevent this, add this utility function. It traverses up the management chain to ensure the proposed manager does not 
 already report to the employee.
*/
/*
 * Checks if assigning a manager would cause a cyclical reference (infinite loop).
 * @param {string} employeeId - The MongoDB _id of the employee being updated/created.
 * @param {string} managerId - The MongoDB _id of the proposed manager.
 * @returns {Promise<boolean>} - True if a cycle is detected, false otherwise.
 */
export const wouldCauseCyclicHierarchy = async (employeeId, managerId) => {
  // 1. An employee cannot be their own manager
  if (employeeId && employeeId.toString() === managerId.toString()) {
    return true;
  }

  let currentManagerId = managerId;

  // 2. Walk up the chain to see if the employee appears as an ancestor
  while (currentManagerId) {
    const manager = await Employee.findById(currentManagerId).select('manager');
    
    if (!manager) break;

    // If the employee being edited is found up the chain, it's a loop!
    if (manager.manager && manager.manager.toString() === employeeId.toString()) {
      return true;
    }

    currentManagerId = manager.manager;
  }

  return false;
};