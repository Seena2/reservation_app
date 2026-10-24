import { validateDOB } from './dateValidator.js';

/*
 * Validates the complete profile of an employee
 * @param {Object} data - The employee data object from req.body
 * @returns {Object} { isValid: boolean, errors: Object|null }
 */
export const validateEmployeeData = (data) => {
    const errors ={}
    const {user,firstName, middleName, lastName ,dateOfBirth, email,phone,address, department,position, salary,
     dateOfHired,status , manager} = data;

    //  Required text fields (Simple presence checks)
        const requiredTextFields = { user,  firstName,middleName,lastName, address, department, position, status };
        for (const [key, value] of Object.entries(requiredTextFields)) {
            if (!value || String(value).trim() === '') {
            errors[key] = `${key.replace(/([A-Z])/g, ' $1')} is required.`;
            }
        }
         if(firstName.trim().length < 3){
            errors.firstName= "First name  must be at least 3 characters long."
        }
        if(middleName.trim().length < 3){
            errors.middleName= "Middle name  must be at least 3 characters long."
        }
        if(lastName.trim().length < 3){
           errors.lastName= "Last name  must be at least 3 characters long."
        }

    // Compose and reuse the Date of Birth validation utility function
        const dobCheck = validateDOB(dateOfBirth, 18); // Setting minimum age for employees to 18
        if (!dobCheck.isValid) {
            errors.dateOfBirth = dobCheck.error;
        }
      // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            errors.email = 'Email is required.';
        } else if (!emailRegex.test(email)) {
         errors.email = 'Invalid email format.';
        }

     // 4. Phone Validation (Basic international / local structure check)
     const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/; 
        if (!!Array.isArray(phone) || !phone.length) {
                 errors.phone = 'Phone number is required.';
        } else if (!phoneRegex.test(String(phone).replace(/[\s-]/g, ''))) {
            errors.phone = 'Invalid phone number format.';
        }

        // 5. Salary Validation (Must be a positive number)
            const salaryNum = Number(salary);
            if (salary === undefined || salary === null || salary === '') {
                errors.salary = 'Salary is required.';
            } else if (isNaN(salaryNum) || salaryNum <= 0) {
                errors.salary = 'Salary must be a positive number.';
            }

         // 6. Date of Hire Validation
            if (!dateOfHired) {
                errors.dateOfHired = 'Date of hire is required.';
            } else {
                const hireDate = new Date(dateOfHired);
                if (isNaN(hireDate.getTime())) {
                    errors.dateOfHired = 'Invalid date of hire.';
                } else if (dobCheck.isValid && dateOfBirth) {
                // Logic check: Cannot be hired before they were born
                const dobDate = new Date(dateOfBirth);
                if (hireDate <= dobDate) {
                 errors.dateOfHired = 'Date of hire cannot be before or equal to date of birth.';
                }
            }
         }
             
    //   return the captured error as an object
       return {
            isValid: Object.keys(errors).length === 0,
            errors: Object.keys(errors).length > 0 ? errors : null
        };
    }

 
    