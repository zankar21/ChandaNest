class AppRoutes {
  static const splash = '/splash';
  static const welcome = '/welcome';
  static const onboardingCity = '/onboarding/city';
  static const onboardingLanguage = '/onboarding/language';
  static const city = '/city';
  static const home = '/home';
  static const explore = '/explore';
  static const map = '/map';
  static const saved = '/saved';
  static const propertyDetails = '/p/:propertyId';
  static const propertyDetailsBase = '/p';
  static const enquiry = '/enquiry/:propertyId';
  static const enquiryBase = '/enquiry';

  static const ownerLogin = '/owner/login';
  static const ownerDashboard = '/owner/dashboard';
  static const ownerListings = '/owner/listings';
  static const ownerPost = '/owner/post';
  static const ownerEdit = '/owner/edit/:propertyId';
  static const ownerEditBase = '/owner/edit';
  static const ownerLeads = '/owner/leads';

  static const agentDashboard = '/agent/dashboard';
  static const agentLeads = '/agent/leads';
  static const agentListings = '/agent/listings';

  static const agencyDashboard = '/agency/dashboard';

  static const enterpriseDashboard = '/enterprise/dashboard';

  static const accessDenied = '/access-denied';
}
