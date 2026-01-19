import 'property.dart';
import 'project.dart';

class HomePayload {
  HomePayload({required this.featuredProperties, required this.featuredProjects});

  final List<Property> featuredProperties;
  final List<Project> featuredProjects;
}
