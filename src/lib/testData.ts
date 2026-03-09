export const generateTestData = () => {
  const names = ['Ahmed Al Mansouri', 'Fatima Hassan', 'Mohammed Khalil', 'Sarah Abdullah', 'Omar Al Zahra', 'Layla Al Rashid']
  const companies = ['Emirates Trading Co', 'Dubai Gold LLC', 'Al Mansouri Group', 'Gulf Electronics', 'Desert Rose Trading', 'Burj Commerce']
  const domains = ['gmail.com', 'outlook.com', 'dsrpro.ae', 'emirates.ae', 'dubai.ae']
  const roles = ['agent', 'vendor']
  
  const randomName = names[Math.floor(Math.random() * names.length)]
  const randomCompany = companies[Math.floor(Math.random() * companies.length)]
  const randomDomain = domains[Math.floor(Math.random() * domains.length)]
  const randomRole = roles[Math.floor(Math.random() * roles.length)]
  
  const email = randomName.toLowerCase().replace(/\s+/g, '.') + '@' + randomDomain
  const phone = '+971' + Math.floor(Math.random() * 9 + 1) + Math.floor(Math.random() * 900 + 100) + Math.floor(Math.random() * 9000 + 1000)
  
  return {
    name: randomName,
    email: email,
    password: 'test123',
    role: randomRole,
    companyName: randomCompany,
    phone: phone
  }
}